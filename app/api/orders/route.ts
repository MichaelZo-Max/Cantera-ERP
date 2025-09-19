import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { createOrderSchema } from "@/lib/validations";

/**
 * @route   GET /api/orders
 * @desc    Obtener una lista de todos los pedidos.
 * @access  Private
 */
export async function GET() {
  try {

    const sql = `
      SELECT
          p.id,
          p.order_number,
          p.status,
          p.created_at,
          c.name AS client_name,
          (SELECT SUM(pi.quantity * pi.price_per_unit)
           FROM RIP.APP_PEDIDOS_ITEMS pi
           WHERE pi.order_id = p.id) AS total,
          -- Información de despachos para calcular progreso
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id) AS total_deliveries,
          (SELECT COUNT(*) FROM RIP.APP_DESPACHOS d WHERE d.order_id = p.id AND d.status = 'EXITED') AS completed_deliveries
      FROM
          RIP.APP_PEDIDOS AS p
      JOIN
          RIP.VW_APP_CLIENTES AS c ON p.customer_id = c.id
      ORDER BY
          p.created_at DESC;
    `;

    const rawOrders = await executeQuery(sql);

    const orders = rawOrders.map((order: any) => ({
      ...order,
      client: {
        id: order.customer_id,
        name: order.client_name,
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
 * @desc    Crear un nuevo pedido y asociar camiones/choferes.
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

    // 👇 1. Extrae los nuevos arrays del cuerpo validado
    const { customer_id, destination_id, items, total, truck_ids, driver_ids } =
      validation.data;

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
        { name: "price_per_unit", type: TYPES.Decimal, value: item.price_per_unit },
      ]);
    }

    // 👇 2. Insertar las relaciones en las tablas de unión
    // Asociar Camiones
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

    // Asociar Choferes
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

    // **CAMBIO:** Obtener el order_number para devolverlo en la respuesta.
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
        order_number: newOrderNumber, // <-- **CAMBIO:** Se añade el número de orden a la respuesta
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