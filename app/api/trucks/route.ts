// app/api/trucks/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

/**
 * @route GET /api/trucks
 * @desc Obtener todos los camiones activos con su chofer
 */
export async function GET() {
  try {
    const query = `
      SELECT 
        t.id, t.placa, t.brand, t.model, t.capacity, t.is_active,
        d.id as driverId, d.nombre as driverName
      FROM RIP.APP_CAMIONES t
      LEFT JOIN RIP.APP_CHOFERES d ON t.driver_id = d.id
      WHERE t.is_active = 1 
      ORDER BY t.placa;
    `;
    const trucksData = await executeQuery(query);
    
    const trucks = trucksData.map(t => ({
      id: t.id,
      placa: t.placa,
      brand: t.brand,
      model: t.model,
      capacity: t.capacity,
      is_active: t.is_active,
      driverId: t.driverId,
      driver: t.driverId ? {
        id: t.driverId,
        nombre: t.driverName
      } : null
    }));

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
    const { placa, brand, model, capacity, driverId } = body;

    if (!placa || !capacity) {
      return new NextResponse('La placa y la capacidad son requeridas', { status: 400 });
    }

    const query = `
      INSERT INTO RIP.APP_CAMIONES (placa, brand, model, capacity, driver_id)
      OUTPUT INSERTED.id, INSERTED.placa, INSERTED.brand, INSERTED.model, INSERTED.capacity, INSERTED.is_active, INSERTED.driver_id
      VALUES (@placa, @brand, @model, @capacity, @driverId);
    `;

    const params = [
      { name: 'placa', type: TYPES.NVarChar, value: placa },
      { name: 'brand', type: TYPES.NVarChar, value: brand },
      { name: 'model', type: TYPES.NVarChar, value: model },
      { name: 'capacity', type: TYPES.Decimal, value: capacity },
      { name: 'driverId', type: TYPES.Int, value: driverId || null },
    ];

    const result = await executeQuery(query, params);
    
    const driverQuery = `SELECT id, nombre FROM RIP.APP_CHOFERES WHERE id = @driverId`;
    const driverResult = driverId ? await executeQuery(driverQuery, [{name: 'driverId', type: TYPES.Int, value: driverId}]) : [];
    const driver = driverResult.length > 0 ? driverResult[0] : null;

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('trucks');
    if (driverId) {
      revalidateTag('drivers'); // Invalidar choferes si se asigna uno
    }

    return NextResponse.json({ ...result[0], driver }, { status: 201 });

  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      const duplicateValue = error.message.match(/\(([^)]+)\)/)?.[1];
      return new NextResponse(`La placa '${duplicateValue}' ya existe.`, { status: 409 });
    }
    console.error('[API_TRUCKS_POST]', error);
    return new NextResponse('Error al crear el camión', { status: 500 });
  }
}
