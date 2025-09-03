// app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route   GET /api/customers
 * @desc    Obtener todos los clientes activos desde la BDD
 */
export async function GET() {
  try {
    const query = `
      SELECT id, name AS nombre, rfc AS rif, address, phone, email, is_active AS isActive
      FROM RIP.VW_APP_CLIENTES
      ORDER BY nombre;
    `;
    const customers = await executeQuery(query);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('[API_CUSTOMERS_GET]', error);
    return new NextResponse('Error al obtener clientes', { status: 500 });
  }
}

/**
 * @route   POST /api/customers
 * @desc    Crear un nuevo cliente en la tabla principal
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, rif, address, phone, email } = body;

    if (!nombre) {
      return new NextResponse("El nombre del cliente es requerido", { status: 400 });
    }

    const query = `
      INSERT INTO dbo.CLIENTES (NOMBRECLIENTE, NIF20, DIRECCION1, TELEFONO1, E_MAIL, DESCATALOGADO)
      OUTPUT INSERTED.CODCLIENTE as id, INSERTED.NOMBRECLIENTE as nombre, INSERTED.NIF20 as rif, INSERTED.DIRECCION1 as address, INSERTED.TELEFONO1 as phone, INSERTED.E_MAIL as email, IIF(INSERTED.DESCATALOGADO = 'F', 1, 0) as isActive
      VALUES (@nombre, @rif, @address, @phone, @email, 'F');
    `;

    const params = [
      { name: 'nombre', type: TYPES.NVarChar, value: nombre },
      { name: 'rif', type: TYPES.NVarChar, value: rif || null },
      { name: 'address', type: TYPES.NVarChar, value: address || null },
      { name: 'phone', type: TYPES.NVarChar, value: phone || null },
      { name: 'email', type: TYPES.NVarChar, value: email || null },
    ];

    const result = await executeQuery(query, params);
    return NextResponse.json(result[0], { status: 201 });

  } catch (error) {
    console.error('[API_CUSTOMERS_POST]', error);
    return new NextResponse('Error al crear el cliente', { status: 500 });
  }
}