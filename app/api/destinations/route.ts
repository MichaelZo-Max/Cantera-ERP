// app/api/destinations/route.ts

import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import type { Destination } from '@/lib/types';

/**
 * @route   GET /api/destinations
 * @desc    Obtener los destinos de un cliente específico
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      // Si no se provee un clientId, devolvemos un array vacío.
      return NextResponse.json([]);
    }

    const query = `
      SELECT
        id,
        name AS nombre,
        address AS direccion,
        is_active AS isActive
      FROM RIP.APP_DESTINOS
      WHERE customer_id = @clientId AND is_active = 1;
    `;
    
    const params = [
      { name: 'clientId', type: TYPES.Int, value: parseInt(clientId, 10) }
    ];

    const destinationsData = await executeQuery(query, params);

    const destinations: Destination[] = destinationsData.map(d => ({
        id: d.id.toString(),
        clientId: clientId, // Lo añadimos de vuelta ya que lo tenemos
        nombre: d.nombre,
        direccion: d.direccion,
        isActive: d.isActive,
        createdAt: new Date(), // Dummy date, no viene de la BDD en esta consulta
        updatedAt: new Date(), // Dummy date
    }));

    return NextResponse.json(destinations);
  } catch (error) {
    console.error('[API_DESTINATIONS_GET]', error);
    return new NextResponse('Error al obtener los destinos', { status: 500 });
  }
}