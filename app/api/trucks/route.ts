import { NextResponse } from 'next/server';
import { mockTrucks } from '@/lib/mock-data';
import type { Truck } from '@/lib/types';

/**
 * @route   GET /api/trucks
 * @desc    Obtener todos los camiones
 */
export async function GET() {
  return NextResponse.json(mockTrucks.filter(t => t.isActive));
}

/**
 * @route   POST /api/trucks
 * @desc    Crear un nuevo camión
 */
export async function POST(request: Request) {
    const body = await request.json();
    const { placa } = body;
    if (!placa) {
        return new NextResponse("La placa es requerida", { status: 400 });
    }
    const newTruck: Truck = {
        id: `truck_${Date.now()}`,
        ...body,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockTrucks.push(newTruck);
    return NextResponse.json(newTruck, { status: 201 });
}