// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { TYPES } from 'tedious';

/**
 * @route   GET /api/products
 * @desc    Obtener todos los productos activos desde la BDD
 */
export async function GET() {
  try {
    const query = `
      SELECT id, codigo, name AS nombre, price_per_unit, unit AS unidadBase, is_active AS isActive
      FROM RIP.VW_APP_PRODUCTOS
      WHERE is_active = 1;
    `;
    const products = await executeQuery(query);
    return NextResponse.json(products);
  } catch (error) {
    console.error('[API_PRODUCTS_GET]', error);
    return new NextResponse('Error al obtener productos', { status: 500 });
  }
}