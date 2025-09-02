import { NextResponse } from 'next/server';
import { mockClients } from '@/lib/mock-data';
import type { Client } from '@/lib/types';

/**
 * @route   GET /api/customers
 * @desc    Obtener todos los clientes
 */
export async function GET() {
  return NextResponse.json(mockClients.filter(c => c.isActive));
}

/**
 * @route   POST /api/customers
 * @desc    Crear un nuevo cliente
 */
export async function POST(request: Request) {
    const body = await request.json();
    const { nombre } = body;
    if (!nombre) {
        return new NextResponse("El nombre es requerido", { status: 400 });
    }
    const newClient: Client = {
        id: `client_${Date.now()}`,
        ...body,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockClients.push(newClient);
    return NextResponse.json(newClient, { status: 201 });
}