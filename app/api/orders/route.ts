// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { createOrderSchema } from "@/lib/validations";
import { InvoiceProduct } from "@/lib/types";

// La función GET no necesita cambios
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const searchTerm = searchParams.get("q") || "";
    const statusFilter = searchParams.get("status");

    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    const params: any[] = [];

    if (searchTerm) {
      whereClauses.push(
        `(p.order_number LIKE @searchTerm OR c.NOMBRECLIENTE LIKE @searchTerm)`
      );
      params.push({
        name: "searchTerm",
        type: TYPES.NVarChar,
        value: `%${searchTerm}%`,
      });
    }

    if (statusFilter === "active_for_yard") {
      whereClauses.push(`p.status IN ('INVOICED', 'PARTIALLY_DISPATCHED')`);
    } else if (statusFilter) {
      whereClauses.push(`p.status = @status`);
      params.push({
        name: "status",
        type: TYPES.NVarChar,
        value: statusFilter,
      });
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM RIP.VW_APP_PEDIDOS p JOIN dbo.CLIENTES c ON p.customer_id = c.CODCLIENTE ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total ?? 0;

    const dataQuery = `
      SELECT
          p.*,
          (SELECT SUM(pi.quantity * pi.price_per_unit)
           FROM RIP.APP_PEDIDOS_ITEMS pi
           WHERE pi.order_id = p.id) AS total,
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id) AS total_deliveries,
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id AND d.status = 'EXITED') AS completed_deliveries,
          c.NOMBRECLIENTE as customer_name_from_join -- Para el filtro
      FROM
          RIP.VW_APP_PEDIDOS AS p
      JOIN dbo.CLIENTES c ON p.customer_id = c.CODCLIENTE
      ${whereClause}
      ORDER BY
          p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const rawOrders = await executeQuery(dataQuery, [
      ...params,
      { name: "offset", type: TYPES.Int, value: offset },
      { name: "limit", type: TYPES.Int, value: limit },
    ]);

    const orders = rawOrders.map((order: any) => ({
      ...order,
      invoices:
        typeof order.invoices === "string" ? JSON.parse(order.invoices) : [],
      client: {
        id: order.customer_id,
        name: order.customer_name,
      },
    }));

    return NextResponse.json({
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
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
    const isInvoiceOrder = invoices && invoices.length > 0;
    const orderStatus = isInvoiceOrder ? "INVOICED" : "PENDING_INVOICE";

    if (isInvoiceOrder) {
      // --- Lógica para órdenes CON factura (sin cambios) ---
      const invoiceParams = invoices.flatMap((inv, index) => [
        {
          name: `series_${index}`,
          type: TYPES.NVarChar,
          value: inv.invoice_series,
        },
        { name: `number_${index}`, type: TYPES.Int, value: inv.invoice_number },
        { name: `n_${index}`, type: TYPES.NVarChar, value: inv.invoice_n },
      ]);
      const conditions = invoices
        .map(
          (_, i) =>
            `(invoice_series = @series_${i} AND invoice_number = @number_${i} AND invoice_n = @n_${i})`
        )
        .join(" OR ");
      const itemsQuery = `
        SELECT product_id AS id, product_name AS name, product_code AS code, price_per_unit, unit, quantity_pending AS available_quantity
        FROM RIP.VW_APP_FACTURA_ITEMS_PENDIENTES WHERE ${conditions};
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
      // Para órdenes SIN factura, simplemente usamos los items que envía el cliente.
      trustedItems = itemsFromClient;
    }

    if (trustedItems.length === 0) {
      return NextResponse.json(
        { error: "El pedido debe tener al menos un producto." },
        { status: 400 }
      );
    }

    // =================================================================
    // PASO 1: Crear SIEMPRE el pedido principal para obtener su ID
    // =================================================================
    const orderHeaderSql = `
      INSERT INTO RIP.APP_PEDIDOS (customer_id, destination_id, status, created_by)
      OUTPUT INSERTED.id
      VALUES (@customer_id, @destination_id, @status, @created_by);
    `;
    const headerResult = await executeQuery(orderHeaderSql, [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "destination_id", type: TYPES.Int, value: destination_id },
      { name: "status", type: TYPES.NVarChar, value: orderStatus },
      { name: "created_by", type: TYPES.Int, value: user.id },
    ]);

    if (!headerResult || !headerResult[0]?.id) {
      throw new Error("Falló la creación del encabezado del pedido principal.");
    }
    const newOrderId = headerResult[0].id;

    // =================================================================
    // PASO 2: Si es una orden SIN factura, crear la orden de caja y VINCULARLA
    // =================================================================
    if (!isInvoiceOrder) {
      const total_usd = trustedItems.reduce(
        (acc, item) => acc + item.quantity * item.price_per_unit,
        0
      );

      const cashierOrderHeaderSql = `
        INSERT INTO RIP.APP_ORDENES_SIN_FACTURA_CAB (customer_id, total_usd, created_by, related_order_id) -- Columna añadida
        OUTPUT INSERTED.id
        VALUES (@customer_id, @total_usd, @created_by, @related_order_id); -- Valor añadido
      `;
      const cashierHeaderResult = await executeQuery(cashierOrderHeaderSql, [
        { name: "customer_id", type: TYPES.Int, value: customer_id },
        { name: "total_usd", type: TYPES.Decimal, value: total_usd },
        { name: "created_by", type: TYPES.Int, value: user.id },
        { name: "related_order_id", type: TYPES.Int, value: newOrderId }, // <-- LA MAGIA ESTÁ AQUÍ
      ]);
      const newCashierOrderId = cashierHeaderResult[0].id;

      for (const item of trustedItems) {
        const productInfo =
          (
            await executeQuery(
              "SELECT DESCRIPCION, REFPROVEEDOR FROM dbo.ARTICULOS WHERE CODARTICULO = @id",
              [{ name: "id", type: TYPES.Int, value: item.product_id }]
            )
          )[0] || {};

        const cashierItemSql = `
          INSERT INTO RIP.APP_ORDENES_SIN_FACTURA_ITEMS (order_cab_id, product_id, product_ref, product_name, quantity, price_per_unit_usd)
          VALUES (@order_cab_id, @product_id, @product_ref, @product_name, @quantity, @price_per_unit_usd);
        `;
        await executeQuery(cashierItemSql, [
          { name: "order_cab_id", type: TYPES.Int, value: newCashierOrderId },
          { name: "product_id", type: TYPES.Int, value: item.product_id },
          {
            name: "product_ref",
            type: TYPES.NVarChar,
            value: productInfo.REFPROVEEDOR || "",
          },
          {
            name: "product_name",
            type: TYPES.NVarChar,
            value: productInfo.DESCRIPCION || "N/A",
          },
          { name: "quantity", type: TYPES.Decimal, value: item.quantity },
          {
            name: "price_per_unit_usd",
            type: TYPES.Decimal,
            value: item.price_per_unit,
          },
        ]);
      }
    }

    // =================================================================
    // PASO 3: Insertar items y el resto de datos en el pedido principal
    // =================================================================
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

    if (isInvoiceOrder) {
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
      await executeQuery(
        "INSERT INTO RIP.APP_PEDIDOS_CAMIONES (pedido_id, camion_id) VALUES (@pedido_id, @camion_id);",
        [
          { name: "pedido_id", type: TYPES.Int, value: newOrderId },
          { name: "camion_id", type: TYPES.Int, value: camion_id },
        ]
      );
    }

    for (const chofer_id of driver_ids) {
      await executeQuery(
        "INSERT INTO RIP.APP_PEDIDOS_CHOFERES (pedido_id, chofer_id) VALUES (@pedido_id, @chofer_id);",
        [
          { name: "pedido_id", type: TYPES.Int, value: newOrderId },
          { name: "chofer_id", type: TYPES.Int, value: chofer_id },
        ]
      );
    }

    const getOrderNumberSql = `SELECT order_number FROM RIP.APP_PEDIDOS WHERE id = @order_id;`;
    const orderNumberResult = await executeQuery(getOrderNumberSql, [
      { name: "order_id", type: TYPES.Int, value: newOrderId },
    ]);
    const newOrderNumber = orderNumberResult[0]?.order_number;

    revalidateTag("orders");
    revalidateTag("cashier_orders"); // Invalida también el cache de las órdenes de caja

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
