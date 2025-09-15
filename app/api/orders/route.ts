// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from 'next/cache';
import { createOrderSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido.
 * @access  Private
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new NextResponse("El cuerpo de la solicitud está vacío.", { status: 400 });
    }
    const body = JSON.parse(rawBody);

    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.errors), { status: 400 });
    }

    const {
      customer_id,
      destination_id,
      truck_id,
      // driver_id, // Lo recibimos pero no lo insertamos aquí
      items,
    } = validation.data;

    // 👇 --- INICIO DEL CAMBIO --- 👇
    // Se elimina `driver_id` de la consulta y de los parámetros.
    const pedidoSql = `
      INSERT INTO rip.APP_PEDIDOS (customer_id, destination_id, truck_id, created_at, status)
      OUTPUT INSERTED.id
      VALUES (@customer_id, @destination_id, @truck_id, GETDATE(), 'PENDIENTE');
    `;

    const pedidoParams = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "destination_id", type: TYPES.Int, value: destination_id },
      { name: "truck_id", type: TYPES.Int, value: truck_id },
    ];
    // ☝️ --- FIN DEL CAMBIO --- ☝️

    const pedidoResult = await executeQuery<any>(pedidoSql, pedidoParams);
    const pedido_id = pedidoResult[0].id;

    // La inserción de los items del pedido se mantiene igual
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