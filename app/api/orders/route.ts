// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { createOrderSchema } from "@/lib/validations";

export async function GET() {
  try {
    // 1. La vista ya nos trae el campo "invoices" como un JSON string
    const sql = `
      SELECT
          p.*, -- Seleccionamos todas las columnas de la vista
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

    // 2. Procesamos la respuesta para convertir el JSON de facturas en un array
    const orders = rawOrders.map((order: any) => ({
      ...order,
      // Si `invoices` es un string, lo parseamos. Si no, devolvemos un array vacío.
      invoices:
        typeof order.invoices === "string"
          ? JSON.parse(order.invoices)
          : [],
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

/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido y asociar items, facturas, camiones y choferes.
 * @access  Private
 */
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

    // NOTA: Recuerda actualizar `createOrderSchema` para que espere un array `invoices`
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

    // --- 👇 CAMBIO: Extraer el array de facturas ---
    const {
      customer_id,
      destination_id,
      items,
      truck_ids,
      driver_ids,
      invoices, // Ahora es un array
    } = validation.data;

    // --- 👇 CAMBIO: La inserción en APP_PEDIDOS ya no incluye campos de factura ---
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

    // Insertar los items del pedido (esto no cambia)
    for (const item of items) {
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
    
    // --- 👇 NUEVO: Bucle para asociar cada factura con el pedido ---
    for (const invoice of invoices) {
        const invoiceSql = `
            INSERT INTO RIP.APP_PEDIDOS_FACTURAS (pedido_id, invoice_series, invoice_number, invoice_n)
            VALUES (@pedido_id, @invoice_series, @invoice_number, @invoice_n);
        `;
        await executeQuery(invoiceSql, [
            { name: "pedido_id", type: TYPES.Int, value: newOrderId },
            { name: "invoice_series", type: TYPES.NVarChar, value: invoice.invoice_series },
            { name: "invoice_number", type: TYPES.Int, value: invoice.invoice_number },
            { name: "invoice_n", type: TYPES.NVarChar, value: invoice.invoice_n },
        ]);
    }

    // Asociar Camiones (esto no cambia)
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

    // Asociar Choferes (esto no cambia)
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
