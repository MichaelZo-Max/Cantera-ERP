// app/api/destinations/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import type { Destination } from '@/lib/types';

/**
 * @route GET /api/destinations
 * @desc Obtener los destinos de un cliente específico
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json([]);
    }

    const query = `
      SELECT id, name AS nombre, address AS direccion, is_active AS isActive
      FROM RIP.APP_DESTINOS
      WHERE customer_id = @clientId AND is_active = 1;
    `;
    
    const params = [
      { name: 'clientId', type: TYPES.Int, value: parseInt(clientId, 10) }
    ];

    const destinationsData = await executeQuery(query, params);

    const destinations: Destination[] = destinationsData.map(d => ({
        id: d.id.toString(),
        clientId: clientId,
        nombre: d.nombre,
        direccion: d.direccion,
        isActive: d.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    return NextResponse.json(destinations);
  } catch (error) {
    console.error('[API_DESTINATIONS_GET]', error);
    return new NextResponse('Error al obtener los destinos', { status: 500 });
  }
}

/**
 * @route POST /api/destinations
 * @desc Crear un nuevo destino para un cliente
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, name, address } = body;

    if (!customer_id || !name) {
      return new NextResponse('El ID del cliente y el nombre del destino son requeridos', { status: 400 });
    }

    const query = `
      INSERT INTO RIP.APP_DESTINOS (customer_id, name, address)
      OUTPUT INSERTED.id, INSERTED.customer_id, INSERTED.name, INSERTED.address, INSERTED.is_active
      VALUES (@customer_id, @name, @address);
    `;

    const params = [
      { name: 'customer_id', type: TYPES.Int, value: customer_id },
      { name: 'name', type: TYPES.NVarChar, value: name },
      { name: 'address', type: TYPES.NVarChar, value: address },
    ];

    const result = await executeQuery(query, params);
    return NextResponse.json(result[0], { status: 201 });

  } catch (error) {
    console.error('[API_DESTINATIONS_POST]', error);
    return new NextResponse('Error al crear el destino', { status: 500 });
  }
}