// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth"; // Importamos la función para obtener el usuario del servidor
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from 'next/cache';
import { createOrderSchema } from "@/lib/validations";

/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido.
 * @access  Private
 */
export async function POST(req: Request) {
  try {
    // 1. Obtener el usuario de la sesión
    const { user } = await getUser();
    if (!user) {
      return new NextResponse("No autorizado. Inicia sesión para continuar.", { status: 401 });
    }

    const body = await req.json();

    // 2. Validar el cuerpo de la solicitud (sin userId, ya que lo tomamos de la sesión)
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.errors), { status: 400 });
    }

    const {
      customer_id,
      destination_id,
      truck_id,
      items,
    } = validation.data;

    // 3. Preparar y ejecutar la consulta SQL para insertar el pedido
    const pedidoSql = `
      INSERT INTO rip.APP_PEDIDOS (customer_id, destination_id, truck_id, created_by, created_at, status)
      OUTPUT INSERTED.id
      VALUES (@customer_id, @destination_id, @truck_id, @created_by, GETDATE(), 'PENDIENTE');
    `;

    const pedidoParams = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "destination_id", type: TYPES.Int, value: destination_id },
      { name: "truck_id", type: TYPES.Int, value: truck_id },
      { name: "created_by", type: TYPES.Int, value: user.id }, // Usamos el ID del usuario de la sesión
    ];

    const pedidoResult = await executeQuery<any>(pedidoSql, pedidoParams);
    const pedido_id = pedidoResult[0].id;

    // 4. Insertar los items del pedido (esto se mantiene igual)
    for (const item of items) {
      const itemSql = `
        INSERT INTO rip.APP_PEDIDOS_ITEMS (pedido_id, producto_id, quantity, unit_price, total_price)
        VALUES (@pedido_id, @producto_id, @quantity, @unit_price, @total_price);
      `;
      const itemParams = [
        { name: "pedido_id", type: TYPES.Int, value: pedido_id },
        { name: "producto_id", type: TYPES.Int, value: item.producto_id },
        { name: "quantity", type: TYPES.Decimal, value: item.quantity },
        { name: "unit_price", type: TYPES.Decimal, value: item.unit_price },
        { name: "total_price", type: TYPES.Decimal, value: item.total_price },
      ];
      await executeQuery(itemSql, itemParams);
    }

    revalidateTag('orders');

    return NextResponse.json({ id: pedido_id, message: "Pedido creado con éxito" });

  } catch (error) {
    if (error instanceof SyntaxError) {
      return new NextResponse("JSON inválido en el cuerpo de la solicitud.", { status: 400 });
    }
    console.error("[API_ORDERS_POST]", error);
    return new NextResponse("Error interno al crear el pedido", { status: 500 });
  }
}