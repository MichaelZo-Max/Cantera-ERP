import { NextResponse } from 'next/server';
import { mockOrders, mockDeliveries, mockClients, mockTrucks } from '@/lib/mock-data';
import type { Order, Delivery } from '@/lib/types';
import { generateOrderNumber } from '@/lib/utils';

/**
 * @route   GET /api/orders
 * @desc    Obtener todos los pedidos
 */
export async function GET() {
    // Simular joins con datos relacionados
    const populatedOrders = mockOrders.map(order => ({
        ...order,
        client: mockClients.find(c => c.id === order.clientId)
    }));
  return NextResponse.json(populatedOrders);
}

/**
 * @route   POST /api/orders
 * @desc    Crear un nuevo pedido y su delivery inicial
 */
export async function POST(request: Request) {
    const body = await request.json();
    const { clientId, items, pago, truck, destinationId } = body;

    if (!clientId || !items || items.length === 0 || !pago || !truck) {
        return new NextResponse("Faltan datos para crear la orden", { status: 400 });
    }
    
    // Aquí iría la lógica para calcular el total, validar precios, etc.
    const total = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), pago.monto);

    const newOrder: Order = {
        id: `order_${Date.now()}`,
        orderNumber: generateOrderNumber(),
        clientId,
        destinationId,
        estado: 'PAGADA', // Asumimos que se paga al crear
        total,
        totalPagado: pago.monto,
        createdBy: 'user-cajero-1', // Debería venir del usuario autenticado
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockOrders.push(newOrder);
    
    // Crear un delivery asociado para cada item (simplificado a uno por ahora)
    const newDelivery: Delivery = {
        id: `delivery_${Date.now()}`,
        orderId: newOrder.id,
        truckId: mockTrucks.find(t => t.placa === truck.placa)?.id || 't-unknown',
        cantidadBase: items[0].cantidadBase,
        estado: 'ASIGNADA',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockDeliveries.push(newDelivery);

    return NextResponse.json({ order: newOrder, delivery: newDelivery }, { status: 201 });
}