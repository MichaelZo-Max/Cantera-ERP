// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server"
import { executeQuery, TYPES } from "@/lib/db"
import { revalidateTag } from "next/cache"
import { orderUpdateSchema } from "@/lib/validations" // Asegúrate de que esta importación exista

export const dynamic = "force-dynamic"

/**
 * @route   GET /api/orders/[id]
 * @desc    Obtener un pedido específico con TODAS sus relaciones
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 })
    }

    // 1. Obtener datos principales del pedido y cliente
    const orderQuery = `
      SELECT
          p.id, p.order_number, p.status, p.created_at, p.notes,
          p.customer_id, p.destination_id,
          c.name AS client_name, c.rfc,
          d.name AS destino_name
      FROM RIP.APP_PEDIDOS p
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      LEFT JOIN RIP.APP_DESTINOS d ON d.id = p.destination_id
      WHERE p.id = @id;
    `
    const orderResult = await executeQuery(orderQuery, [{ name: "id", type: TYPES.Int, value: id }])

    if (orderResult.length === 0) {
      return new NextResponse("Pedido no encontrado", { status: 404 })
    }
    const order = orderResult[0]

    // 2. Obtener los items del pedido
    const itemsQuery = `
      SELECT
          i.id, i.quantity, i.price_per_unit, i.unit,
          prod.id as product_id,
          prod.name AS product_name,
          prod.unit as product_unit
      FROM RIP.APP_PEDIDOS_ITEMS i
      JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = i.product_id
      WHERE i.order_id = @id;
    `
    const itemsResult = await executeQuery(itemsQuery, [{ name: "id", type: TYPES.Int, value: id }])

    // 3. Obtener los camiones autorizados
    const trucksQuery = `
      SELECT t.id, t.placa, t.brand, t.model
      FROM RIP.APP_PEDIDOS_CAMIONES pc
      JOIN RIP.APP_CAMIONES t ON t.id = pc.camion_id
      WHERE pc.pedido_id = @id;
    `
    const trucksResult = await executeQuery(trucksQuery, [{ name: "id", type: TYPES.Int, value: id }])

    // 4. Obtener los choferes autorizados
    const driversQuery = `
      SELECT c.id, c.name, c.docId
      FROM RIP.APP_PEDIDOS_CHOFERES pch
      JOIN RIP.APP_CHOFERES c ON c.id = pch.chofer_id
      WHERE pch.pedido_id = @id;
    `
    const driversResult = await executeQuery(driversQuery, [{ name: "id", type: TYPES.Int, value: id }])

    // 5. Construir el objeto de respuesta final
    const populatedOrder = {
      ...order,
      client: {
          id: order.customer_id,
          name: order.client_name,
          rfc: order.rfc
      },
      items: itemsResult.map((item: any) => ({
        id: item.id,
        quantity: Number(item.quantity),
        price_per_unit: Number(item.price_per_unit),
        unit: item.unit,
        product: {
          id: item.product_id,
          name: item.product_name,
          unit: item.product_unit,
        },
      })),
      trucks: trucksResult, // <-- Ya vienen en el formato correcto
      drivers: driversResult, // <-- Ya vienen en el formato correcto
    }

    return NextResponse.json(populatedOrder)
  } catch (error) {
    console.error(`[API_ORDERS_ID_GET]`, error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}


/**
 * @route   PUT /api/orders/[id]
 * @desc    Actualizar un pedido completo (datos, items, camiones y choferes)
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 })
    }

    const body = await request.json()
    // Aquí usamos la validación de Zod que ya tenías
    const validation = orderUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }
    
    const { items, truck_ids, driver_ids, ...orderData } = validation.data;

    // --- INICIO DE LA TRANSACCIÓN ---
    // (Simulada, ya que executeQuery no soporta transacciones nativas de la misma forma que Prisma)
    // Se ejecutarán las queries en secuencia. Si una falla, las anteriores no se revierten automáticamente.
    // Para una aplicación crítica, se debería implementar una lógica de transacción a nivel de SQL Server si es posible.

    // 1. Actualizar los datos principales del pedido
    const updateOrderQuery = `
        UPDATE RIP.APP_PEDIDOS
        SET customer_id = @customer_id, 
            destination_id = @destination_id, 
            total = @total, 
            updated_at = GETDATE()
        WHERE id = @id;
    `;
    await executeQuery(updateOrderQuery, [
        { name: "id", type: TYPES.Int, value: id },
        { name: "customer_id", type: TYPES.Int, value: orderData.customer_id },
        { name: "destination_id", type: TYPES.Int, value: orderData.destination_id },
        { name: "total", type: TYPES.Decimal, value: orderData.total },
    ]);

    // 2. Actualizar Items (Borrar los antiguos e insertar los nuevos)
    await executeQuery(`DELETE FROM RIP.APP_PEDIDOS_ITEMS WHERE order_id = @id`, [{ name: "id", type: TYPES.Int, value: id }]);
    
    for (const item of items) {
        const insertItemQuery = `
            INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
            VALUES (@order_id, @product_id, @quantity, @price_per_unit, @unit);
        `;
        await executeQuery(insertItemQuery, [
            { name: "order_id", type: TYPES.Int, value: id },
            { name: "product_id", type: TYPES.Int, value: item.product_id },
            { name: "quantity", type: TYPES.Decimal, value: item.quantity },
            { name: "price_per_unit", type: TYPES.Decimal, value: item.price_per_unit },
            { name: "unit", type: TYPES.NVarChar, value: item.unit },
        ]);
    }

    // 3. Actualizar Camiones
    await executeQuery(`DELETE FROM RIP.APP_PEDIDOS_CAMIONES WHERE pedido_id = @id`, [{ name: "id", type: TYPES.Int, value: id }]);
    for (const truckId of truck_ids) {
        const insertTruckQuery = `INSERT INTO RIP.APP_PEDIDOS_CAMIONES (pedido_id, camion_id) VALUES (@pedido_id, @camion_id);`;
        await executeQuery(insertTruckQuery, [
            { name: "pedido_id", type: TYPES.Int, value: id },
            { name: "camion_id", type: TYPES.Int, value: truckId },
        ]);
    }

    // 4. Actualizar Choferes
    await executeQuery(`DELETE FROM RIP.APP_PEDIDOS_CHOFERES WHERE pedido_id = @id`, [{ name: "id", type: TYPES.Int, value: id }]);
    for (const driverId of driver_ids) {
        const insertDriverQuery = `INSERT INTO RIP.APP_PEDIDOS_CHOFERES (pedido_id, chofer_id) VALUES (@pedido_id, @chofer_id);`;
        await executeQuery(insertDriverQuery, [
            { name: "pedido_id", type: TYPES.Int, value: id },
            { name: "chofer_id", type: TYPES.Int, value: driverId },
        ]);
    }

    // --- FIN DE LA TRANSACCIÓN ---

    // Invalidar caché para reflejar los cambios
    revalidateTag("orders")
    revalidateTag(`order-${id}`)

    return NextResponse.json({ message: "Pedido actualizado correctamente", id: id })

  } catch (error) {
    console.error(`[API_ORDERS_ID_PUT]`, error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}