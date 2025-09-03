// app/api/trucks/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route GET /api/trucks/[id]
 * @desc Obtener un camión por su ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const query = "SELECT * FROM RIP.APP_CAMIONES WHERE id = @id";
    const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
    if (result.length === 0) {
      return new NextResponse('Camión no encontrado', { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[API_TRUCKS_GET_BY_ID]', error);
    return new NextResponse('Error al obtener el camión', { status: 500 });
  }
}

/**
 * @route PATCH /api/trucks/[id]
 * @desc Actualizar un camión
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { placa, brand, model, capacity, driver_name, is_active } = body;

        const query = `
            UPDATE RIP.APP_CAMIONES
            SET 
                placa = @placa, 
                brand = @brand, 
                model = @model, 
                capacity = @capacity, 
                driver_name = @driver_name,
                is_active = @is_active,
                updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;
        const queryParams = [
            { name: 'id', type: TYPES.Int, value: params.id },
            { name: 'placa', type: TYPES.NVarChar, value: placa },
            { name: 'brand', type: TYPES.NVarChar, value: brand },
            { name: 'model', type: TYPES.NVarChar, value: model },
            { name: 'capacity', type: TYPES.Decimal, value: capacity },
            { name: 'driver_name', type: TYPES.NVarChar, value: driver_name },
            { name: 'is_active', type: TYPES.Bit, value: is_active }
        ];

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Camión no encontrado para actualizar', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_TRUCKS_PATCH]', error);
        return new NextResponse('Error al actualizar el camión', { status: 500 });
    }
}

/**
 * @route DELETE /api/trucks/[id]
 * @desc Desactivar un camión (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = `
            UPDATE RIP.APP_CAMIONES
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        return NextResponse.json({ message: 'Camión desactivado correctamente' });
    } catch (error) {
        console.error('[API_TRUCKS_DELETE]', error);
        return new NextResponse('Error al desactivar el camión', { status: 500 });
    }
}