// app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

/**
 * @route   GET /api/orders/[id]
 * @desc    Obtener un pedido específico por su ID desde la BDD
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return new NextResponse('ID de pedido inválido', { status: 400 });
    }

    const orderQuery = `
        SELECT
            p.id, p.order_number, p.status, p.created_at, p.notes,
            c.id AS clientId, c.name AS client_name, c.rfc,
            d.name AS destino_name,
            t.placa AS truck_placa
        FROM RIP.APP_PEDIDOS p
        JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
        LEFT JOIN RIP.APP_DESTINOS d ON d.id = p.destination_id
        JOIN RIP.APP_CAMIONES t ON t.id = p.truck_id
        WHERE p.id = @id;
    `;
    const orderResult = await executeQuery(orderQuery, [{ name: 'id', type: TYPES.Int, value: id }]);

    if (orderResult.length === 0) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    const itemsQuery = `
        SELECT
            i.id, i.quantity, i.price_per_unit,
            f.sku, f.unit_base,
            prod.name AS product_name
        FROM RIP.APP_PEDIDOS_ITEMS i
        JOIN RIP.APP_PRODUCTOS_FORMATOS f ON f.id = i.format_id
        JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = i.product_id
        WHERE i.order_id = @id;
    `;
    const itemsResult = await executeQuery(itemsQuery, [{ name: 'id', type: TYPES.Int, value: id }]);

    const order = orderResult[0];
    const populatedOrder = {
        ...order,
        client: { id: order.clientId, nombre: order.client_name, rif: order.rfc },
        destination: { nombre: order.destino_name },
        truck: { placa: order.truck_placa },
        items: itemsResult
    };

    return NextResponse.json(populatedOrder);
  } catch (error) {
    console.error(`[API_ORDERS_ID_GET]`, error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}


/**
 * @route   PATCH /api/orders/[id]
 * @desc    Actualizar un pedido (ej: cambiar estado o notas) en la BDD
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return new NextResponse('ID de pedido inválido', { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
        return new NextResponse('El estado es requerido para actualizar', { status: 400 });
    }

    const query = `
        UPDATE RIP.APP_PEDIDOS
        SET
            status = @status,
            notes = ISNULL(@notes, notes),
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id;
    `;
    const queryParams = [
        { name: 'id', type: TYPES.Int, value: id },
        { name: 'status', type: TYPES.NVarChar, value: status },
        { name: 'notes', type: TYPES.NVarChar, value: notes ?? null }
    ];

    const result = await executeQuery(query, queryParams);

    if (result.length === 0) {
        return new NextResponse('Pedido no encontrado para actualizar', { status: 404 });
    }

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('orders');
    revalidateTag('deliveries');

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(`[API_ORDERS_ID_PATCH]`, error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}

/**
 * @route   DELETE /api/orders/[id]
 * @desc    Cancelar un pedido (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return new NextResponse('ID de pedido inválido', { status: 400 });
    }

    const query = `
        UPDATE RIP.APP_PEDIDOS
        SET
            status = 'CANCELADA',
            updated_at = GETDATE()
        WHERE id = @id;
    `;
    
    await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: id }]);

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('orders');
    revalidateTag('deliveries');

    return NextResponse.json({ message: 'Pedido cancelado correctamente' });
  } catch (error) {
    console.error(`[API_ORDERS_ID_DELETE]`, error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}