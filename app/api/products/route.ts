import { NextResponse } from 'next/server';
import { mockProducts } from '@/lib/mock-data';
import type { Product } from '@/lib/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @route   GET /api/products
 * @desc    Obtener todos los productos
 */
export async function GET() {
  await sleep(500);
  return NextResponse.json(mockProducts.filter(p => p.isActive));
}

/**
 * @route   POST /api/products
 * @desc    Crear un nuevo producto
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo, nombre, area, description } = body;

    if (!codigo || !nombre || !area) {
      return new NextResponse('Código, nombre y área son requeridos', { status: 400 });
    }

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      ...body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // NOTA: Esto no es persistente. Se reiniciará con el servidor.
    mockProducts.push(newProduct);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('[API_PRODUCTS_POST]', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}