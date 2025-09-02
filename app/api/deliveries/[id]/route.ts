import { NextResponse } from 'next/server';
import { mockDeliveries } from '@/lib/mock-data';

/**
 * @route   PATCH /api/deliveries/[id]
 * @desc    Actualizar un despacho (para confirmar carga o salida)
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const index = mockDeliveries.findIndex((d) => d.id === params.id);
    if (index === -1) {
        return new NextResponse('Despacho no encontrado', { status: 404 });
    }
    
    const body = await request.json();
    const { estado, loadedQuantity, notes } = body;

    const updatedDelivery = { ...mockDeliveries[index], updatedAt: new Date() };

    if (estado === 'CARGADA') {
        updatedDelivery.estado = 'CARGADA';
        updatedDelivery.loadedQuantity = loadedQuantity;
        updatedDelivery.loadedAt = new Date();
        updatedDelivery.loadedBy = 'user-patio-1'; // Simulado
    } else if (estado === 'SALIDA_OK') {
        updatedDelivery.estado = 'SALIDA_OK';
        updatedDelivery.exitedAt = new Date();
        updatedDelivery.exitedBy = 'user-seguridad-1'; // Simulado
    }

    if(notes) {
        updatedDelivery.notes = notes;
    }

    mockDeliveries[index] = updatedDelivery;

    return NextResponse.json(updatedDelivery);
}