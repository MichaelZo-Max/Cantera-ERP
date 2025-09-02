import { NextResponse } from 'next/server';
import { mockTrucks } from '@/lib/mock-data';

/**
 * @route   GET /api/trucks/[id]
 * @desc    Obtener un camión por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const truck = mockTrucks.find((t) => t.id === params.id);
    if (truck) {
        return NextResponse.json(truck);
    }
    return new NextResponse('Camión no encontrado', { status: 404 });
}

/**
 * @route   PATCH /api/trucks/[id]
 * @desc    Actualizar un camión
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const index = mockTrucks.findIndex((t) => t.id === params.id);
    if (index === -1) {
        return new NextResponse('Camión no encontrado', { status: 404 });
    }
    const body = await request.json();
    mockTrucks[index] = { ...mockTrucks[index], ...body, updatedAt: new Date() };
    return NextResponse.json(mockTrucks[index]);
}

/**
 * @route   DELETE /api/trucks/[id]
 * @desc    Desactivar un camión
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const index = mockTrucks.findIndex((t) => t.id === params.id);
    if (index === -1) {
        return new NextResponse('Camión no encontrado', { status: 404 });
    }
    mockTrucks[index].isActive = false;
    return NextResponse.json({ message: 'Camión desactivado' });
}