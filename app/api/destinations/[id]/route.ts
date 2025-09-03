// app/api/destinations/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route GET /api/destinations/[id]
 * @desc Obtener un destino por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = "SELECT * FROM RIP.APP_DESTINOS WHERE id = @id";
        const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        if (result.length === 0) {
            return new NextResponse('Destino no encontrado', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_DESTINATIONS_GET_BY_ID]', error);
        return new NextResponse('Error al obtener el destino', { status: 500 });
    }
}

/**
 * @route PATCH /api/destinations/[id]
 * @desc Actualizar un destino
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { name, address, is_active } = body;

        const query = `
            UPDATE RIP.APP_DESTINOS
            SET 
                name = @name, 
                address = @address,
                is_active = @is_active,
                updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;
        const queryParams = [
            { name: 'id', type: TYPES.Int, value: params.id },
            { name: 'name', type: TYPES.NVarChar, value: name },
            { name: 'address', type: TYPES.NVarChar, value: address },
            { name: 'is_active', type: TYPES.Bit, value: is_active }
        ];

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Destino no encontrado para actualizar', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_DESTINATIONS_PATCH]', error);
        return new NextResponse('Error al actualizar el destino', { status: 500 });
    }
}

/**
 * @route DELETE /api/destinations/[id]
 * @desc Desactivar un destino
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = `
            UPDATE RIP.APP_DESTINOS
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        return NextResponse.json({ message: 'Destino desactivado correctamente' });
    } catch (error) {
        console.error('[API_DESTINATIONS_DELETE]', error);
        return new NextResponse('Error al desactivar el destino', { status: 500 });
    }
}