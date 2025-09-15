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
    // La consulta se ha corregido para usar la vista VW_APP_CLIENTES
    const sql = `
      SELECT
          p.id,
          p.order_number,
          p.status,
          p.created_at,
          c.name AS client_name,
          (SELECT SUM(pi.quantity * pi.price_per_unit)
           FROM RIP.APP_PEDIDOS_ITEMS pi
           WHERE pi.order_id = p.id) AS total
      FROM
          RIP.APP_PEDIDOS AS p
      JOIN
          RIP.VW_APP_CLIENTES AS c ON p.customer_id = c.id -- Corregido para usar la vista
      ORDER BY
          p.created_at DESC;
    `;

    const orders = await executeQuery(sql);

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
    if (!user) {
      return new NextResponse("No autorizado. Inicia sesión para continuar.", {
        status: 401,
      });
    }

    const body = await req.json();

    // 2. Validar con el esquema corregido
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.errors), {
        status: 400,
      });
    }

    // Se extraen los datos validados. Ahora 'destination_id' está disponible.
    const { customer_id, destination_id, items } = validation.data;

    // 3. Insertar el encabezado del pedido
    const pedidoSql = `
      INSERT INTO CANTERA.rip.APP_PEDIDOS (customer_id, destination_id, created_by, status)
      OUTPUT INSERTED.id
      VALUES (@customer_id, @destination_id, @created_by, 'AWAITING_PAYMENT');
    `;

    const pedidoParams = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "destination_id", type: TYPES.Int, value: destination_id },
      { name: "created_by", type: TYPES.Int, value: user.id },
    ];

    const pedidoResult = await executeQuery<any>(pedidoSql, pedidoParams);
    const pedido_id = pedidoResult[0].id;

    // 4. Insertar los items del pedido
    for (const item of items) {
      const itemSql = `
        INSERT INTO CANTERA.rip.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
        VALUES (@order_id, @product_id, @quantity, @price_per_unit, @unit);
      `;
      const itemParams = [
        { name: "order_id", type: TYPES.Int, value: pedido_id },
        // Ahora 'item.product_id' coincide con el esquema corregido.
        { name: "product_id", type: TYPES.Int, value: item.product_id },
        { name: "quantity", type: TYPES.Decimal, value: item.quantity },
        {
          name: "price_per_unit",
          type: TYPES.Decimal,
          value: item.price_per_unit,
        },
        { name: "unit", type: TYPES.VarChar, value: item.unit },
      ];
      await executeQuery(itemSql, itemParams);
    }

    revalidateTag("orders");

    return NextResponse.json({
      id: pedido_id,
      message: "Pedido creado con éxito",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new NextResponse("JSON inválido en el cuerpo de la solicitud.", {
        status: 400,
      });
    }
    console.error("[API_ORDERS_POST]", error);
    return new NextResponse("Error interno al crear el pedido", {
      status: 500,
    });
  }
}