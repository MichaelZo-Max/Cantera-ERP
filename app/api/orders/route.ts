// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth"; // Importamos la función para obtener el usuario del servidor
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
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
      return new NextResponse("No autorizado. Inicia sesión para continuar.", {
        status: 401,
      });
    }

    const body = await req.json();

    // 2. Validar el cuerpo de la solicitud
    // Asegúrate de que createOrderSchema ahora incluya 'total' y que los items tengan 'unit'.
    // Debería omitir 'destination_id' y 'truck_id'.
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.errors), {
        status: 400,
      });
    }

    // Se extraen los datos validados. 'destination_id' y 'truck_id' ya no son necesarios aquí.
    const { customer_id, total, items } = validation.data;

    // 3. Insertar el encabezado del pedido en APP_PEDIDOS
    const pedidoSql = `
      INSERT INTO CANTERA.rip.APP_PEDIDOS (customer_id, total, created_by, status)
      OUTPUT INSERTED.id
      VALUES (@customer_id, @total, @created_by, 'AWAITING_PAYMENT');
    `;

    const pedidoParams = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "total", type: TYPES.Decimal, value: total },
      { name: "created_by", type: TYPES.Int, value: user.id }, // Usamos el ID del usuario de la sesión
    ];

    const pedidoResult = await executeQuery<any>(pedidoSql, pedidoParams);
    const pedido_id = pedidoResult[0].id;

    // 4. Insertar los items del pedido en APP_PEDIDOS_ITEMS
    for (const item of items) {
      const itemSql = `
        INSERT INTO CANTERA.rip.APP_PEDIDOS_ITEMS (pedido_id, producto_id, quantity, price_per_unit, unit)
        VALUES (@pedido_id, @producto_id, @quantity, @price_per_unit, @unit);
      `;
      const itemParams = [
        { name: "pedido_id", type: TYPES.Int, value: pedido_id },
        { name: "producto_id", type: TYPES.Int, value: item.producto_id },
        { name: "quantity", type: TYPES.Decimal, value: item.quantity },
        {
          name: "price_per_unit",
          type: TYPES.Decimal,
          value: item.price_per_unit,
        },
        { name: "unit", type: TYPES.VarChar, value: item.unit }, // Se añade el campo 'unit'
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
