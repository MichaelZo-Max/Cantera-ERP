import { NextResponse } from 'next/server';
import { mockClients } from '@/lib/mock-data';

/**
 * @route   GET /api/customers/[id]
 * @desc    Obtener un cliente por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const client = mockClients.find((c) => c.id === params.id);
    if (client) {
        return NextResponse.json(client);
    }
    return new NextResponse('Cliente no encontrado', { status: 404 });
}

/**
 * @route   PATCH /api/customers/[id]
 * @desc    Actualizar un cliente
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const index = mockClients.findIndex((c) => c.id === params.id);
    if (index === -1) {
        return new NextResponse('Cliente no encontrado', { status: 404 });
    }
    const body = await request.json();
    mockClients[index] = { ...mockClients[index], ...body, updatedAt: new Date() };
    return NextResponse.json(mockClients[index]);
}

/**
 * @route   DELETE /api/customers/[id]
 * @desc    Desactivar un cliente
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const index = mockClients.findIndex((c) => c.id === params.id);
    if (index === -1) {
        return new NextResponse('Cliente no encontrado', { status: 404 });
    }
    mockClients[index].isActive = false;
    return NextResponse.json({ message: 'Cliente desactivado' });
}