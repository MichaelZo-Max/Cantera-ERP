// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { createOrderSchema } from "@/lib/validations";
import { InvoiceProduct } from "@/lib/types";

// La función GET no necesita cambios
export async function GET() {
  try {
    const sql = `
      SELECT
          p.*,
          (SELECT SUM(pi.quantity * pi.price_per_unit)
           FROM RIP.APP_PEDIDOS_ITEMS pi
           WHERE pi.order_id = p.id) AS total,
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id) AS total_deliveries,
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id AND d.status = 'EXITED') AS completed_deliveries
      FROM
          RIP.VW_APP_PEDIDOS AS p
      ORDER BY
          p.created_at DESC;
    `;

    const rawOrders = await executeQuery(sql);

    const orders = rawOrders.map((order: any) => ({
      ...order,
      invoices:
        typeof order.invoices === "string" ? JSON.parse(order.invoices) : [],
      client: {
        id: order.customer_id,
        name: order.customer_name,
      },
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error("[API_ORDERS_GET]", error);
    return new NextResponse("Error interno al obtener los pedidos", {
      status: 500,
    });
  }
}


export async function POST(req: Request) {
  try {
    const { user } = await getUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión para continuar." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos de la orden inválidos.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      customer_id,
      destination_id,
      items: itemsFromClient,
      truck_ids,
      driver_ids,
      invoices,
    } = validation.data;

    let trustedItems: typeof itemsFromClient = [];

    if (invoices && invoices.length > 0) {
      // --- LÓGICA EXISTENTE PARA ÓRDENES CON FACTURA (SIN CAMBIOS) ---
      const invoiceParams = invoices.flatMap((inv, index) => [
        { name: `series_${index}`, type: TYPES.NVarChar, value: inv.invoice_series },
        { name: `number_${index}`, type: TYPES.Int, value: inv.invoice_number },
        { name: `n_${index}`, type: TYPES.NVarChar, value: inv.invoice_n },
      ]);

      const conditions = invoices
        .map(
          (_, index) =>
            `(invoice_series = @series_${index} AND invoice_number = @number_${index} AND invoice_n = @n_${index})`
        )
        .join(" OR ");

      const itemsQuery = `
        SELECT
            product_id AS id,
            product_name AS name,
            product_code AS code,
            price_per_unit,
            unit,
            quantity_pending AS available_quantity
        FROM 
            RIP.VW_APP_FACTURA_ITEMS_PENDIENTES
        WHERE 
            ${conditions};
      `;

      const productsFromInvoices: InvoiceProduct[] = await executeQuery(
        itemsQuery,
        invoiceParams
      );

      trustedItems = productsFromInvoices.map((p) => ({
        product_id: p.id,
        quantity: p.available_quantity,
        price_per_unit: p.price_per_unit ?? 0,
        unit: p.unit || "UNIDAD",
      }));
    } else {
      // --- ESTE ES EL CASO DE UNA ORDEN SIN FACTURA (MANUAL) ---
      trustedItems = itemsFromClient;

      // --- NUEVA LÓGICA 👇: GUARDAR LA ORDEN DE CAJA PARA AUDITORÍA ---
      if (trustedItems.length > 0) {
        // Calculamos el total de la orden manual
        const total_usd = trustedItems.reduce((acc, item) => acc + item.quantity * item.price_per_unit, 0);

        // 1. Insertar la cabecera en la nueva tabla de auditoría
        const cashierOrderHeaderSql = `
          INSERT INTO RIP.APP_ORDENES_SIN_FACTURA_CAB (customer_id, total_usd, created_by)
          OUTPUT INSERTED.id
          VALUES (@customer_id, @total_usd, @created_by);
        `;
        const cashierHeaderResult = await executeQuery(cashierOrderHeaderSql, [
          { name: "customer_id", type: TYPES.Int, value: customer_id },
          { name: "total_usd", type: TYPES.Decimal, value: total_usd },
          { name: "created_by", type: TYPES.Int, value: user.id },
        ]);
        const newCashierOrderId = cashierHeaderResult[0].id;

        // 2. Insertar cada item en la nueva tabla de auditoría
        for (const item of trustedItems) {
            // Necesitamos obtener el nombre y la referencia del producto
            const productInfo = await executeQuery('SELECT DESCRIPCION, REFPROVEEDOR FROM dbo.ARTICULOS WHERE CODARTICULO = @id', [{ name: 'id', type: TYPES.Int, value: item.product_id }]);

            const cashierItemSql = `
                INSERT INTO RIP.APP_ORDENES_SIN_FACTURA_ITEMS (order_cab_id, product_id, product_ref, product_name, quantity, price_per_unit_usd)
                VALUES (@order_cab_id, @product_id, @product_ref, @product_name, @quantity, @price_per_unit_usd);
            `;
            await executeQuery(cashierItemSql, [
                { name: "order_cab_id", type: TYPES.Int, value: newCashierOrderId },
                { name: "product_id", type: TYPES.Int, value: item.product_id },
                { name: "product_ref", type: TYPES.NVarChar, value: productInfo[0]?.REFPROVEEDOR || '' },
                { name: "product_name", type: TYPES.NVarChar, value: productInfo[0]?.DESCRIPCION || 'N/A' },
                { name: "quantity", type: TYPES.Decimal, value: item.quantity },
                { name: "price_per_unit_usd", type: TYPES.Decimal, value: item.price_per_unit },
            ]);
        }
      }
      // --- FIN DE LA NUEVA LÓGICA ---
    }

    if (trustedItems.length === 0) {
      return NextResponse.json(
        { error: "El pedido debe tener al menos un producto." },
        { status: 400 }
      );
    }
    
    // --- EL RESTO DEL CÓDIGO SIGUE EXACTAMENTE IGUAL ---
    // Crea el pedido en RIP.APP_PEDIDOS, asocia items, camiones y choferes como siempre.
    
    const orderHeaderSql = `
        INSERT INTO RIP.APP_PEDIDOS (customer_id, destination_id, status, created_by)
        OUTPUT INSERTED.id
        VALUES (@customer_id, @destination_id, 'PAID', @created_by);
    `;

    const headerResult = await executeQuery(orderHeaderSql, [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "destination_id", type: TYPES.Int, value: destination_id },
      { name: "created_by", type: TYPES.Int, value: user.id },
    ]);

    if (!headerResult || headerResult.length === 0 || !headerResult[0].id) {
      throw new Error(
        "Falló la creación del encabezado de la orden en la base de datos."
      );
    }

    const newOrderId = headerResult[0].id;

    for (const item of trustedItems) {
      const itemSql = `
          INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, unit, price_per_unit)
          VALUES (@order_id, @product_id, @quantity, @unit, @price_per_unit);
      `;
      await executeQuery(itemSql, [
        { name: "order_id", type: TYPES.Int, value: newOrderId },
        { name: "product_id", type: TYPES.Int, value: item.product_id },
        { name: "quantity", type: TYPES.Decimal, value: item.quantity },
        { name: "unit", type: TYPES.NVarChar, value: item.unit },
        {
          name: "price_per_unit",
          type: TYPES.Decimal,
          value: item.price_per_unit,
        },
      ]);
    }

    if (invoices && invoices.length > 0) {
      for (const invoice of invoices) {
        const invoiceSql = `
                INSERT INTO RIP.APP_PEDIDOS_FACTURAS (pedido_id, invoice_series, invoice_number, invoice_n)
                VALUES (@pedido_id, @invoice_series, @invoice_number, @invoice_n);
            `;
        await executeQuery(invoiceSql, [
          { name: "pedido_id", type: TYPES.Int, value: newOrderId },
          {
            name: "invoice_series",
            type: TYPES.NVarChar,
            value: invoice.invoice_series,
          },
          {
            name: "invoice_number",
            type: TYPES.Int,
            value: invoice.invoice_number,
          },
          { name: "invoice_n", type: TYPES.NVarChar, value: invoice.invoice_n },
        ]);
      }
    }

    for (const camion_id of truck_ids) {
      const truckSql = `
        INSERT INTO RIP.APP_PEDIDOS_CAMIONES (pedido_id, camion_id)
        VALUES (@pedido_id, @camion_id);
      `;
      await executeQuery(truckSql, [
        { name: "pedido_id", type: TYPES.Int, value: newOrderId },
        { name: "camion_id", type: TYPES.Int, value: camion_id },
      ]);
    }

    for (const chofer_id of driver_ids) {
      const driverSql = `
        INSERT INTO RIP.APP_PEDIDOS_CHOFERES (pedido_id, chofer_id)
        VALUES (@pedido_id, @chofer_id);
      `;
      await executeQuery(driverSql, [
        { name: "pedido_id", type: TYPES.Int, value: newOrderId },
        { name: "chofer_id", type: TYPES.Int, value: chofer_id },
      ]);
    }

    const getOrderNumberSql = `
      SELECT order_number FROM RIP.APP_PEDIDOS WHERE id = @order_id;
    `;
    const orderNumberResult = await executeQuery(getOrderNumberSql, [
      { name: "order_id", type: TYPES.Int, value: newOrderId },
    ]);

    const newOrderNumber = orderNumberResult[0]?.order_number;

    revalidateTag("orders");

    return NextResponse.json(
      {
        message: "Orden creada con éxito",
        order_id: newOrderId,
        order_number: newOrderNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API_ORDERS_POST_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Ocurrió un error desconocido";
    return NextResponse.json(
      { error: "Error interno al crear la orden", details: errorMessage },
      { status: 500 }
    );
  }
}