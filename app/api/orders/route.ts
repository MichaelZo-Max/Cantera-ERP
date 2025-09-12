// app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic'

// GET: Se ajusta la consulta para que coincida con los nombres de columna reales de tu BBDD
export async function GET() {
  try {
    const query = `
      SELECT
        p.id,
        p.order_number,
        p.status AS estado,
        p.notes,
        p.created_at,
        c.id AS clientId,
        c.name AS clientName,
        (SELECT SUM(quantity * price_per_unit) FROM RIP.APP_PEDIDOS_ITEMS WHERE order_id = p.id) AS total
      FROM RIP.APP_PEDIDOS p
      JOIN RIP.VW_APP_CLIENTES c ON p.customer_id = c.id
      ORDER BY p.created_at DESC;
    `;

    const ordersData = await executeQuery(query);

    const orders = ordersData.map((order: any) => ({
      id: order.id.toString(),
      orderNumber: order.order_number,
      clientId: order.clientId.toString(),
      client: {
        nombre: order.clientName,
      },
      estado: order.estado,
      total: order.total,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.created_at,
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[API_ORDERS_GET]', error);
    return new NextResponse('Error al obtener las órdenes', { status: 500 });
  }
}


/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido y su despacho inicial.
 * @note    LÓGICA CORREGIDA para funcionar con `executeQuery` y el nuevo esquema.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const destinationId = formData.get('destinationId') as string | null;
    const itemsJson = formData.get('items') as string;
    const pagoJson = formData.get('pago') as string;
    const truckId = formData.get('truckId') as string;
    const userId = formData.get('userId') as string;
    const photoFile = formData.get('photoFile') as File | null;

    if (!clientId || !truckId || !itemsJson || !pagoJson || !userId) {
      return new NextResponse("Faltan datos para crear la orden", { status: 400 });
    }

    const items = JSON.parse(itemsJson);
    const pago = JSON.parse(pagoJson);

    // --- Lógica de la foto (sin cambios) ---
    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    // 1. Insertar en RIP.APP_PEDIDOS
    // Se usa la columna `status` según tu tabla.
    const orderQuery = `
      INSERT INTO RIP.APP_PEDIDOS (customer_id, truck_id, destination_id, status, notes, created_by)
      OUTPUT INSERTED.id, INSERTED.order_number
      VALUES (@customerId, @truckId, @destinationId, @status, @notes, @createdBy);
    `;
    const orderParams = [
      { name: 'customerId', type: TYPES.Int, value: parseInt(clientId, 10) },
      { name: 'truckId', type: TYPES.Int, value: parseInt(truckId, 10) },
      { name: 'destinationId', type: TYPES.Int, value: destinationId ? parseInt(destinationId, 10) : null },
      // Se usa 'PAID' según el nuevo flujo del SQL.md
      { name: 'status', type: TYPES.NVarChar, value: 'PAID' }, 
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
      { name: 'createdBy', type: TYPES.Int, value: parseInt(userId, 10) },
    ];
    const orderResult = await executeQuery(orderQuery, orderParams);
    const { id: newOrderId, order_number } = orderResult[0];

    // 2. Insertar en RIP.APP_PEDIDOS_ITEMS
    for (const item of items) {
      // Se usan las columnas `unit`, `quantity`, `price_per_unit`
      const itemQuery = `
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
        VALUES (@orderId, @productId, @quantity, @price_per_unit, @unit);
      `;
      
      const itemParams = [
        { name: 'orderId', type: TYPES.Int, value: newOrderId },
        { name: 'productId', type: TYPES.Int, value: parseInt(item.product.id, 10) },
        // CORRECCIÓN: La sintaxis para tipos Decimal es con options
        { name: 'quantity', type: TYPES.Decimal, value: item.quantity, options: { precision: 18, scale: 2 } },
        { name: 'price_per_unit', type: TYPES.Decimal, value: item.pricePerUnit, options: { precision: 18, scale: 2 } },
        { name: 'unit', type: TYPES.NVarChar, value: item.product.unit }
      ];
      await executeQuery(itemQuery, itemParams);
    }

    // 3. Insertar en RIP.APP_DESPACHOS
    const deliveryQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, status, notes, load_photo_url)
      OUTPUT INSERTED.id
      VALUES (@orderId, 'PENDING', @notes, @photoUrl);
    `;
    const deliveryParams = [
      { name: 'orderId', type: TYPES.Int, value: newOrderId },
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
      { name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl },
    ];
    const deliveryResult = await executeQuery(deliveryQuery, deliveryParams);
    const newDeliveryId = deliveryResult[0].id;
    
    revalidateTag('orders');
    revalidateTag('deliveries');

    return NextResponse.json({
      message: "Pedido y despacho creados exitosamente",
      order: { id: newOrderId, orderNumber: order_number },
      delivery: { id: newDeliveryId, status: 'PENDING' }
    }, { status: 201 });

  } catch (error) {
    console.error('[API_ORDERS_POST]', error);
    return new NextResponse('Error al crear el pedido', { status: 500 });
  }
}
