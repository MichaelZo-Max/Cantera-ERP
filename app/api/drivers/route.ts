// app/api/drivers/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import type { Driver } from '@/lib/types';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

export const dynamic = 'force-dynamic'

/**
 * @route GET /api/drivers
 * @desc Obtener todos los choferes desde la tabla RIP.APP_CHOFERES.
 */
export async function GET() {
  try {
    const query = `
      SELECT id, nombre, docId, phone, is_active 
      FROM RIP.APP_CHOFERES 
      ORDER BY nombre;
    `;
    const drivers = await executeQuery(query);
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('[API_DRIVERS_GET]', error);
    return new NextResponse('Error al obtener choferes', { status: 500 });
  }
}

/**
 * @route POST /api/drivers
 * @desc Crear un nuevo chofer en la tabla RIP.APP_CHOFERES.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, docId, phone } = body;

        if (!nombre) {
            return new NextResponse("El nombre es requerido", { status: 400 });
        }

        const query = `
            INSERT INTO RIP.APP_CHOFERES (nombre, docId, phone)
            OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.docId, INSERTED.phone, INSERTED.is_active
            VALUES (@nombre, @docId, @phone);
        `;
        const params = [
            { name: 'nombre', type: TYPES.NVarChar, value: nombre },
            { name: 'docId', type: TYPES.NVarChar, value: docId ?? null },
            { name: 'phone', type: TYPES.NVarChar, value: phone ?? null },
        ];
        
        const result = await executeQuery(query, params);

        // ✨ INVALIDACIÓN DEL CACHÉ
        revalidateTag('drivers');

        return NextResponse.json(result[0], { status: 201 });

    } catch (error) {
        console.error('[API_DRIVERS_POST]', error);
        return new NextResponse('Error al crear el chofer', { status: 500 });
    }
}
