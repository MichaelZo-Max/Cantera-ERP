// app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

export const dynamic = 'force-dynamic'

/**
 * @route   GET /api/orders
 * @desc    Obtener todas las órdenes para la lista del cajero.
 */
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
 * @desc    Crear un nuevo pedido y su despacho inicial
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

    // --- LÓGICA REAL PARA GUARDAR LA FOTO ---
    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');

      // Asegurarse de que el directorio de subida existe
      await mkdir(uploadDir, { recursive: true });

      // Escribir el archivo en el directorio
      await writeFile(path.join(uploadDir, filename), buffer);

      // La URL pública para guardar en la base de datos
      photoUrl = `/uploads/${filename}`;
      console.log(`Foto guardada exitosamente en: ${photoUrl}`);
    }
    // --- FIN LÓGICA FOTO ---

    // 1) Pedido
    const orderQuery = `
      INSERT INTO RIP.APP_PEDIDOS (customer_id, truck_id, destination_id, status, notes, created_by)
      OUTPUT INSERTED.id, INSERTED.order_number
      VALUES (@customerId, @truckId, @destinationId, @status, @notes, @createdBy);
    `;
    const orderParams = [
      { name: 'customerId', type: TYPES.Int, value: parseInt(clientId, 10) },
      { name: 'truckId', type: TYPES.Int, value: parseInt(truckId, 10) },
      { name: 'destinationId', type: TYPES.Int, value: destinationId ? parseInt(destinationId, 10) : null },
      { name: 'status', type: TYPES.NVarChar, value: 'CREADA' },
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
      { name: 'createdBy', type: TYPES.Int, value: parseInt(userId, 10) },
    ];
    const orderResult = await executeQuery(orderQuery, orderParams);
    const { id: newOrderId, order_number } = orderResult[0];

    // 2) Ítems
    for (const item of items) {
      const formatId = parseInt(item.productFormatId, 10);
      const itemQuery = `
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, format_id, quantity, price_per_unit)
        SELECT @orderId, pf.product_id, @formatId, @quantity, pf.price_per_unit
        FROM RIP.APP_PRODUCTOS_FORMATOS pf
        WHERE pf.id = @formatId;
      `;
      const itemParams = [
        { name: 'orderId', type: TYPES.Int, value: newOrderId },
        { name: 'formatId', type: TYPES.Int, value: formatId },
        { name: 'quantity', type: TYPES.Decimal, value: item.cantidadBase, options: { precision: 18, scale: 2 } },
      ];
      await executeQuery(itemQuery, itemParams);
    }

    // 3) Despacho inicial (con la URL de la foto)
    const deliveryQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, status, notes, load_photo_url)
      OUTPUT INSERTED.id
      VALUES (@orderId, 'ASIGNADA', @notes, @photoUrl);
    `;
    const deliveryParams = [
      { name: 'orderId', type: TYPES.Int, value: newOrderId },
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
      { name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl },
    ];
    const deliveryResult = await executeQuery(deliveryQuery, deliveryParams);
    const newDeliveryId = deliveryResult[0].id;
    
    // ... (resto del código sin cambios)
    const totalQuery = `
      SELECT SUM(quantity * price_per_unit) AS total
      FROM RIP.APP_PEDIDOS_ITEMS WHERE order_id = @orderId;
    `;
    const total = (await executeQuery(totalQuery, [{ name: 'orderId', type: TYPES.Int, value: newOrderId }]))[0]?.total ?? 0;

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('orders');
    revalidateTag('deliveries'); // También invalidamos despachos por si acaso

    return NextResponse.json({
      message: "Pedido y despacho creados exitosamente",
      order: { id: newOrderId, orderNumber: order_number, total },
      delivery: { id: newDeliveryId, status: 'ASIGNADA' }
    }, { status: 201 });

  } catch (error) {
    console.error('[API_ORDERS_POST]', error);
    return new NextResponse('Error al crear el pedido', { status: 500 });
  }
}