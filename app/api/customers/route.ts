// app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { TYPES } from 'tedious';

/**
 * @route   GET /api/customers
 * @desc    Obtener todos los clientes activos desde la BDD
 */
export async function GET() {
  try {
    const query = `
      SELECT id, name AS nombre, rfc AS rif, address, phone, email, is_active AS isActive
      FROM RIP.VW_APP_CLIENTES
      WHERE is_active = 1;
    `;
    const customers = await executeQuery(query);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('[API_CUSTOMERS_GET]', error);
    return new NextResponse('Error al obtener clientes', { status: 500 });
  }
}