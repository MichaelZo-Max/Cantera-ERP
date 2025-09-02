import { NextResponse } from 'next/server';
import { mockOrders, mockClients, mockDeliveries } from '@/lib/mock-data';

/**
 * @route   GET /api/orders/[id]
 * @desc    Obtener un pedido específico por su ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const order = mockOrders.find((o) => o.id === params.id);

    if (!order) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    // Simular joins para enriquecer la respuesta
    const populatedOrder = {
        ...order,
        client: mockClients.find(c => c.id === order.clientId),
        deliveries: mockDeliveries.filter(d => d.orderId === order.id)
    };

    return NextResponse.json(populatedOrder);
  } catch (error) {
    console.error(`[API_ORDERS_ID_GET]`, error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}

/**
 * @route   PATCH /api/orders/[id]
 * @desc    Actualizar un pedido (ej: cambiar estado o notas)
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const index = mockOrders.findIndex((o) => o.id === params.id);

    if (index === -1) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    const body = await request.json();
    
    // Actualiza el pedido con los nuevos datos
    mockOrders[index] = { 
        ...mockOrders[index], 
        ...body, 
        updatedAt: new Date() 
    };

    return NextResponse.json(mockOrders[index]);
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
    const index = mockOrders.findIndex((o) => o.id === params.id);

    if (index === -1) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    // Cambia el estado a 'CANCELADA' en lugar de borrarlo
    mockOrders[index].estado = 'CANCELADA';
    mockOrders[index].updatedAt = new Date();

    // También podrías cancelar los deliveries asociados
    mockDeliveries.forEach(delivery => {
        if (delivery.orderId === params.id) {
            delivery.estado = 'RECHAZADA';
        }
    });

    return NextResponse.json({ message: `Pedido ${mockOrders[index].orderNumber} cancelado` });
  } catch (error) {
    console.error(`[API_ORDERS_ID_DELETE]`, error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}