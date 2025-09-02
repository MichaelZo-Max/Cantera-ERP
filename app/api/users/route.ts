import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock-data';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const index = mockUsers.findIndex((u) => u.id === params.id);
    if (index === -1) {
        return new NextResponse('Usuario no encontrado', { status: 404 });
    }
    const body = await request.json();
    mockUsers[index] = { ...mockUsers[index], ...body, updatedAt: new Date() };
    return NextResponse.json(mockUsers[index]);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const index = mockUsers.findIndex((u) => u.id === params.id);
    if (index === -1) {
        return new NextResponse('Usuario no encontrado', { status: 404 });
    }
    // Toggle status
    mockUsers[index].isActive = !mockUsers[index].isActive;
    mockUsers[index].updatedAt = new Date();
    return NextResponse.json({ message: 'Estado del usuario actualizado' });
}