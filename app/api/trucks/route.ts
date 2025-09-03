// app/api/trucks/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route GET /api/trucks
 * @desc Obtener todos los camiones activos
 */
export async function GET() {
  try {
    const query = `
      SELECT id, placa, brand, model, capacity, driver_name, is_active
      FROM RIP.APP_CAMIONES 
      WHERE is_active = 1 
      ORDER BY placa;
    `;
    const trucks = await executeQuery(query);
    return NextResponse.json(trucks);
  } catch (error) {
    console.error('[API_TRUCKS_GET]', error);
    return new NextResponse('Error al obtener camiones', { status: 500 });
  }
}

/**
 * @route POST /api/trucks
 * @desc Crear un nuevo camión
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { placa, brand, model, capacity, driver_name } = body;

    if (!placa || !capacity) {
      return new NextResponse('La placa y la capacidad son requeridas', { status: 400 });
    }

    const query = `
      INSERT INTO RIP.APP_CAMIONES (placa, brand, model, capacity, driver_name)
      OUTPUT INSERTED.id, INSERTED.placa, INSERTED.brand, INSERTED.model, INSERTED.capacity, INSERTED.driver_name, INSERTED.is_active
      VALUES (@placa, @brand, @model, @capacity, @driver_name);
    `;

    const params = [
      { name: 'placa', type: TYPES.NVarChar, value: placa },
      { name: 'brand', type: TYPES.NVarChar, value: brand },
      { name: 'model', type: TYPES.NVarChar, value: model },
      { name: 'capacity', type: TYPES.Decimal, value: capacity },
      { name: 'driver_name', type: TYPES.NVarChar, value: driver_name },
    ];

    const result = await executeQuery(query, params);
    return NextResponse.json(result[0], { status: 201 });

  } catch (error) {
    console.error('[API_TRUCKS_POST]', error);
    return new NextResponse('Error al crear el camión', { status: 500 });
  }
}