import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import type { Driver } from '@/lib/types';

export async function GET() {
  try {
    const query = `SELECT id, nombre, docId, phone, is_active FROM RIP.APP_CHOFERES ORDER BY nombre;`;
    const drivers = await executeQuery(query);
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('[API_DRIVERS_GET]', error);
    return new NextResponse('Error al obtener choferes', { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, docId, phone } = body;

        if (!nombre) {
            return new NextResponse("El nombre es requerido", { status: 400 });
        }

        const query = `
            INSERT INTO RIP.APP_CHOFERES (nombre, docId, phone)
            OUTPUT INSERTED.*
            VALUES (@nombre, @docId, @phone);
        `;
        const params = [
            { name: 'nombre', type: TYPES.NVarChar, value: nombre },
            { name: 'docId', type: TYPES.NVarChar, value: docId ?? null },
            { name: 'phone', type: TYPES.NVarChar, value: phone ?? null },
        ];
        
        const result = await executeQuery(query, params);
        return NextResponse.json(result[0], { status: 201 });

    } catch (error) {
        console.error('[API_DRIVERS_POST]', error);
        return new NextResponse('Error al crear el chofer', { status: 500 });
    }
}