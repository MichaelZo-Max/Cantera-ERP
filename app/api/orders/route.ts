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
    const query = `
      SELECT
        p.id,
        p.order_number AS orderNumber,
        p.status AS estado,
        p.notes,
        p.created_at AS createdAt,
        c.id AS clientId,
        c.name AS clientName,
        ISNULL(SUM(i.quantity * i.price_per_unit), 0) AS total
      FROM RIP.APP_PEDIDOS p
      LEFT JOIN RIP.VW_APP_CLIENTES c ON p.customer_id = c.id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS i ON p.id = i.order_id
      GROUP BY p.id, p.order_number, p.status, p.notes, p.created_at, c.id, c.name
      ORDER BY p.created_at DESC;
    `;

    const ordersData = await executeQuery(query);

    const populatedOrders: Order[] = ordersData.map((order) => ({
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      estado: order.estado,
      notes: order.notes,
      createdAt: order.createdAt,
      total: parseFloat(order.total),
      clientId: order.clientId?.toString(),
      client: {
        id: order.clientId?.toString(),
        nombre: order.clientName,
      },
    }));

    return NextResponse.json(populatedOrders);
  } catch (error) {
    console.error('[API_ORDERS_GET]', error);
    return new NextResponse('Error al obtener los pedidos', { status: 500 });
  }
}


/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido y su despacho inicial
 */
export async function POST(request: Request) {
  try {
    const body: CreateOrderForm = await request.json();
    // CAMBIO: Se desestructura truckId en lugar de truck
    const { clientId, items, pago, truckId } = body;

    // CAMBIO: Se valida truckId
    if (!clientId || !items || items.length === 0 || !pago || !truckId) {
      return new NextResponse("Faltan datos para crear la orden", { status: 400 });
    }

    const orderNumber = generateOrderNumber();
    const orderQuery = `
      INSERT INTO RIP.APP_PEDIDOS (order_number, customer_id, truck_id, status, notes, created_by)
      OUTPUT INSERTED.id
      VALUES (@orderNumber, @customerId, @truckId, 'PAGADA', @notes, @createdBy);
    `;
    
    // CAMBIO: Ya no se busca el camión, se usa el ID directamente.
    const orderParams = [
      { name: 'orderNumber', type: TYPES.NVarChar, value: orderNumber },
      { name: 'customerId', type: TYPES.Int, value: parseInt(clientId, 10) },
      { name: 'truckId', type: TYPES.Int, value: parseInt(truckId, 10) },
      { name: 'notes', type: TYPES.NVarChar, value: pago.ref || null },
      { name: 'createdBy', type: TYPES.Int, value: 1 } // Temporal
    ];
    
    const orderResult = await executeQuery(orderQuery, orderParams);
    const newOrderId = orderResult[0].id;

    if (!newOrderId) {
      throw new Error("No se pudo crear el pedido.");
    }

    for (const item of items) {
      const itemQuery = `
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit)
        VALUES (@orderId, @productId, @quantity, @price);
      `;
      const itemParams = [
        { name: 'orderId', type: TYPES.Int, value: newOrderId },
        { name: 'productId', type: TYPES.Int, value: parseInt(item.productFormatId, 10) },
        { name: 'quantity', type: TYPES.Decimal, value: item.cantidadBase },
        { name: 'price', type: TYPES.Decimal, value: item.pricePerUnit },
      ];
      await executeQuery(itemQuery, itemParams);
    }
    
    const deliveryQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, status)
      OUTPUT INSERTED.id
      VALUES (@orderId, 'ASIGNADA');
    `;
    const deliveryParams = [{ name: 'orderId', type: TYPES.Int, value: newOrderId }];
    const deliveryResult = await executeQuery(deliveryQuery, deliveryParams);
    const newDeliveryId = deliveryResult[0].id;

    return NextResponse.json({ 
        message: "Pedido y despacho creados exitosamente",
        order: { id: newOrderId, orderNumber: orderNumber },
        delivery: { id: newDeliveryId }
    }, { status: 201 });

  } catch (error) {
    console.error('[API_ORDERS_POST]', error);
    return new NextResponse('Error interno del servidor al crear el pedido', { status: 500 });
  }
}