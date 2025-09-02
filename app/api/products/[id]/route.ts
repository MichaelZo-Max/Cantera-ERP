import { NextResponse } from 'next/server';
import { mockProducts } from '@/lib/mock-data';

/**
 * @route   GET /api/products/[id]
 * @desc    Obtener un producto por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const product = mockProducts.find((p) => p.id === params.id);
  if (product) {
    return NextResponse.json(product);
  }
  return new NextResponse('Producto no encontrado', { status: 404 });
}

/**
 * @route   PATCH /api/products/[id]
 * @desc    Actualizar un producto
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const index = mockProducts.findIndex((p) => p.id === params.id);
    if (index === -1) {
        return new NextResponse('Producto no encontrado', { status: 404 });
    }
    const body = await request.json();
    mockProducts[index] = { ...mockProducts[index], ...body, updatedAt: new Date() };
    return NextResponse.json(mockProducts[index]);
}

/**
 * @route   DELETE /api/products/[id]
 * @desc    Desactivar un producto (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const index = mockProducts.findIndex((p) => p.id === params.id);
    if (index === -1) {
        return new NextResponse('Producto no encontrado', { status: 404 });
    }
    mockProducts[index].isActive = false;
    mockProducts[index].updatedAt = new Date();
    return NextResponse.json({ message: 'Producto desactivado' });
}