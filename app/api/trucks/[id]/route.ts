// app/api/trucks/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

export const dynamic = 'force-dynamic'

/**
 * @route GET /api/trucks/[id]
 * @desc Obtener un camión por su ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return new NextResponse('ID de camión inválido', { status: 400 });
    }
    
    const query = "SELECT * FROM RIP.APP_CAMIONES WHERE id = @id";
    const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: id }]);
    
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
 * @desc Actualizar un camión de forma dinámica (solo los campos enviados)
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return new NextResponse('ID de camión inválido', { status: 400 });
        }

        const body = await request.json();
        
        const updates: string[] = [];
        const queryParams: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

        if (body.placa !== undefined) {
            updates.push("placa = @placa");
            queryParams.push({ name: 'placa', type: TYPES.NVarChar, value: body.placa });
        }
        if (body.brand !== undefined) {
            updates.push("brand = @brand");
            queryParams.push({ name: 'brand', type: TYPES.NVarChar, value: body.brand });
        }
        if (body.model !== undefined) {
            updates.push("model = @model");
            queryParams.push({ name: 'model', type: TYPES.NVarChar, value: body.model });
        }
        if (body.capacity !== undefined) {
            updates.push("capacity = @capacity");
            queryParams.push({ name: 'capacity', type: TYPES.Decimal, value: body.capacity });
        }
        if (body.driverId !== undefined) {
            updates.push("driver_id = @driverId");
            queryParams.push({ name: 'driverId', type: TYPES.Int, value: body.driverId || null });
        }
        if (body.is_active !== undefined) {
            updates.push("is_active = @is_active");
            queryParams.push({ name: 'is_active', type: TYPES.Bit, value: body.is_active });
        }

        if (updates.length === 0) {
            const currentTruck = await executeQuery("SELECT * FROM RIP.APP_CAMIONES WHERE id = @id", [{ name: 'id', type: TYPES.Int, value: id }]);
            if (currentTruck.length === 0) {
                return new NextResponse('Camión no encontrado', { status: 404 });
            }
            return NextResponse.json(currentTruck[0]);
        }

        updates.push("updated_at = GETDATE()");

        const query = `
            UPDATE RIP.APP_CAMIONES
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Camión no encontrado para actualizar', { status: 404 });
        }

        // ✨ INVALIDACIÓN DEL CACHÉ
        revalidateTag('trucks');
        if (body.driverId !== undefined) {
          revalidateTag('drivers'); // Invalidar choferes si se cambia la asignación
        }

        return NextResponse.json(result[0]);
    } catch (error: any) {
        if (error?.number === 2627 || error?.number === 2601) {
            const duplicateValue = error.message.match(/\(([^)]+)\)/)?.[1];
            return new NextResponse(`La placa '${duplicateValue}' ya existe.`, { status: 409 });
        }
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
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return new NextResponse('ID de camión inválido', { status: 400 });
        }

        const query = `
            UPDATE RIP.APP_CAMIONES
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: id }]);
        
        // ✨ INVALIDACIÓN DEL CACHÉ
        revalidateTag('trucks');

        return NextResponse.json({ message: 'Camión desactivado correctamente' });
    } catch (error) {
        console.error('[API_TRUCKS_DELETE]', error);
        return new NextResponse('Error al desactivar el camión', { status: 500 });
    }
}
