// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server"
import { executeQuery, TYPES } from "@/lib/db"
import { revalidateTag } from "next/cache" // Importamos revalidateTag

export const dynamic = "force-dynamic"

/**
 * @route   GET /api/orders/[id]
 * @desc    Obtener un pedido específico por su ID desde la BDD
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 })
    }

    console.log("[v0] Fetching order details for ID:", id)

    const orderQuery = `
        SELECT
            p.id, p.order_number, p.status, p.created_at, p.notes,
            c.id AS customer_id, c.name AS client_name, c.rfc,
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

    const deliveriesQuery = `
        SELECT
            d.id, d.status, d.loaded_quantity, d.loaded_at, d.exited_at, d.notes,
            d.load_photo_url, d.exit_photo_url, d.created_at,
            t.placa AS truck_placa
        FROM RIP.APP_DESPACHOS d
        LEFT JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
        WHERE d.order_id = @id
        ORDER BY d.created_at DESC;
    `
    const deliveriesResult = await executeQuery(deliveriesQuery, [{ name: "id", type: TYPES.Int, value: id }])

    const deliveryItemsQuery = `
        SELECT
            di.despacho_id, di.dispatched_quantity,
            pi.id as pedido_item_id, pi.quantity as order_quantity,
            prod.name as product_name, prod.unit
        FROM RIP.APP_DESPACHOS_ITEMS di
        JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.id = di.pedido_item_id
        JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = pi.product_id
        WHERE di.despacho_id IN (SELECT id FROM RIP.APP_DESPACHOS WHERE order_id = @id);
    `
    const deliveryItemsResult = await executeQuery(deliveryItemsQuery, [{ name: "id", type: TYPES.Int, value: id }])

    const order = orderResult[0]

    const deliveriesWithItems = deliveriesResult.map((delivery: any) => ({
      id: delivery.id,
      estado: delivery.status,
      loadedQuantity: delivery.loaded_quantity ? Number(delivery.loaded_quantity) : null,
      loadedAt: delivery.loaded_at,
      exitedAt: delivery.exited_at,
      notes: delivery.notes,
      loadPhoto: delivery.load_photo_url,
      exitPhoto: delivery.exit_photo_url,
      createdAt: delivery.created_at,
      truck: { placa: delivery.truck_placa },
      items: deliveryItemsResult
        .filter((item: any) => item.despacho_id === delivery.id)
        .map((item: any) => ({
          dispatched_quantity: Number(item.dispatched_quantity),
          orderItem: {
            id: item.pedido_item_id,
            quantity: Number(item.order_quantity),
            product: {
              name: item.product_name,
              unit: item.unit,
            },
          },
        })),
    }))

    const populatedOrder = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      client_name: order.client_name,
      total: itemsResult.reduce(
        (sum: number, item: any) => sum + Number(item.quantity) * Number(item.price_per_unit),
        0,
      ),
      items: itemsResult.map((item: any) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price_per_unit: Number(item.price_per_unit),
        unit: item.unit,
        created_at: new Date(),
        updated_at: new Date(),
        product: {
          id: item.product_id,
          name: item.product_name,
          unit: item.product_unit,
        },
      })),
      deliveries: deliveriesWithItems,
    }

    console.log("[v0] Order data being returned:", JSON.stringify(populatedOrder, null, 2))

    return NextResponse.json(populatedOrder)
  } catch (error) {
    console.error(`[API_ORDERS_ID_GET]`, error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

/**
 * @route   PATCH /api/orders/[id]
 * @desc    Actualizar un pedido (ej: cambiar estado o notas) en la BDD
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 })
    }

    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return new NextResponse("El estado es requerido para actualizar", {
        status: 400,
      })
    }

    const query = `
        UPDATE RIP.APP_PEDIDOS
        SET
            status = @status,
            notes = ISNULL(@notes, notes),
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id;
    `
    const queryParams = [
      { name: "id", type: TYPES.Int, value: id },
      { name: "status", type: TYPES.NVarChar, value: status },
      { name: "notes", type: TYPES.NVarChar, value: notes ?? null },
    ]

    const result = await executeQuery(query, queryParams)

    if (result.length === 0) {
      return new NextResponse("Pedido no encontrado para actualizar", {
        status: 404,
      })
    }

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag("orders")
    revalidateTag("deliveries")

    return NextResponse.json(result[0])
  } catch (error) {
    console.error(`[API_ORDERS_ID_PATCH]`, error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

/**
 * @route   DELETE /api/orders/[id]
 * @desc    Cancelar un pedido (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 })
    }

    const query = `
        UPDATE RIP.APP_PEDIDOS
        SET
            status = 'CANCELADA',
            updated_at = GETDATE()
        WHERE id = @id;
    `

    await executeQuery(query, [{ name: "id", type: TYPES.Int, value: id }])

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag("orders")
    revalidateTag("deliveries")

    return NextResponse.json({ message: "Pedido cancelado correctamente" })
  } catch (error) {
    console.error(`[API_ORDERS_ID_DELETE]`, error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}