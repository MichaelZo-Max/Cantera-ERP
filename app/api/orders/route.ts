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
 * @desc    Crear un nuevo pedido (sin asignación de camión).
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

    // Ahora, gracias al cambio en validations.ts, 'total' será reconocido aquí
    const { customer_id, items, total } = validation.data;

    const orderHeaderSql = `
        INSERT INTO RIP.APP_PEDIDOS (customer_id, total, status, created_by)
        OUTPUT INSERTED.id
        VALUES (@customer_id, @total, 'PAID', @created_by);
    `;

    const headerResult = await executeQuery(orderHeaderSql, [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "total", type: TYPES.Decimal, value: total },
      { name: "created_by", type: TYPES.Int, value: user.id },
    ]);

    if (!headerResult || headerResult.length === 0 || !headerResult[0].id) {
      throw new Error(
        "Falló la creación del encabezado de la orden en la base de datos."
      );
    }

    const newOrderId = headerResult[0].id;

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

    revalidateTag("orders");

    return NextResponse.json(
      {
        message: "Orden creada con éxito",
        order_id: newOrderId,
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
