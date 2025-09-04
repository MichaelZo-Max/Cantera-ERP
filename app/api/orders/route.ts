// app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import { generateOrderNumber } from '@/lib/utils';
import type { CreateOrderForm, Order } from '@/lib/types';

/**
 * @route   GET /api/orders
 * @desc    Obtener todos los pedidos con la información del cliente y el total calculado
 */
export async function GET() {
  try {
    const q = `
      SELECT
        p.id,
        p.order_number,
        p.status,
        p.created_at,
        c.name AS client_name,
        d.name AS destino_name,
        t.placa AS truck_placa,
        ISNULL(SUM(i.quantity * i.price_per_unit), 0) AS total
      FROM RIP.APP_PEDIDOS p
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      LEFT JOIN RIP.APP_DESTINOS d ON d.id = p.destination_id
      JOIN RIP.APP_CAMIONES t ON t.id = p.truck_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS i ON i.order_id = p.id
      GROUP BY p.id, p.order_number, p.status, p.created_at, c.name, d.name, t.placa
      ORDER BY p.id DESC;
    `;
    const rows = await executeQuery(q);
    return NextResponse.json(rows.map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number,
      estado: r.status,
      createdAt: r.created_at,
      total: Number(r.total),
      client: { nombre: r.client_name },
      destino: r.destino_name,
      truck: { placa: r.truck_placa },
    })));
  } catch (e) {
    console.error('[API_ORDERS_GET]', e);
    return new NextResponse('Error al obtener pedidos', { status: 500 });
  }
}


/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido y su despacho inicial
 */
export async function POST(request: Request) {
  try {
    const body: CreateOrderForm = await request.json();
    const { clientId, destinationId, items, pago, truckId } = body;

    if (!clientId || !truckId || !items?.length) {
      return new NextResponse("Faltan datos para crear la orden", { status: 400 });
    }

    // 1) Pedido: NO insertar order_number (es calculado). Usa OUTPUT para recuperar id y order_number.
    const orderQuery = `
      INSERT INTO RIP.APP_PEDIDOS (customer_id, truck_id, destination_id, status, notes, created_by)
      OUTPUT INSERTED.id, INSERTED.order_number
      VALUES (@customerId, @truckId, @destinationId, @status, @notes, @createdBy);
    `;
    const orderParams = [
      { name: 'customerId', type: TYPES.Int, value: parseInt(clientId, 10) },
      { name: 'truckId', type: TYPES.Int, value: parseInt(truckId, 10) },
      { name: 'destinationId', type: TYPES.Int, value: destinationId ? parseInt(destinationId, 10) : null },
      // Unifica estatus: usa 'CREADA' si así lo quieres en front (o mapea si en DB va 'PENDING')
      { name: 'status', type: TYPES.NVarChar, value: 'CREADA' },
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
      { name: 'createdBy', type: TYPES.Int, value: 1 }, // TODO: tomar del usuario autenticado
    ];
    const orderResult = await executeQuery(orderQuery, orderParams);
    const { id: newOrderId, order_number } = orderResult[0];

    // 2) Ítems: usa format_id y deriva product_id desde el formato
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

    // 3) Despacho inicial
    const deliveryQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, status, notes)
      OUTPUT INSERTED.id
      VALUES (@orderId, 'ASIGNADA', @notes);
    `;
    const deliveryParams = [
      { name: 'orderId', type: TYPES.Int, value: newOrderId },
      { name: 'notes', type: TYPES.NVarChar, value: pago?.ref ?? null },
    ];
    const deliveryResult = await executeQuery(deliveryQuery, deliveryParams);
    const newDeliveryId = deliveryResult[0].id;

    // 4) Total del pedido (opcional para la respuesta)
    const totalQuery = `
      SELECT SUM(quantity * price_per_unit) AS total
      FROM RIP.APP_PEDIDOS_ITEMS WHERE order_id = @orderId;
    `;
    const total = (await executeQuery(totalQuery, [{ name: 'orderId', type: TYPES.Int, value: newOrderId }]))[0]?.total ?? 0;

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