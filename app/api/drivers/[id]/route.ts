import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

        const body = await request.json();
        
        const updates: string[] = [];
        const queryParams: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

        if (body.nombre !== undefined) {
            updates.push("nombre = @nombre");
            queryParams.push({ name: 'nombre', type: TYPES.NVarChar, value: body.nombre });
        }
        if (body.docId !== undefined) {
            updates.push("docId = @docId");
            queryParams.push({ name: 'docId', type: TYPES.NVarChar, value: body.docId });
        }
        if (body.phone !== undefined) {
            updates.push("phone = @phone");
            queryParams.push({ name: 'phone', type: TYPES.NVarChar, value: body.phone });
        }
        if (body.is_active !== undefined) {
            updates.push("is_active = @is_active");
            queryParams.push({ name: 'is_active', type: TYPES.Bit, value: body.is_active });
        }

        if (updates.length === 0) {
            const currentDriver = await executeQuery("SELECT * FROM RIP.APP_CHOFERES WHERE id = @id", queryParams);
            return NextResponse.json(currentDriver[0]);
        }
        
        updates.push("updated_at = GETDATE()");

        const query = `
            UPDATE RIP.APP_CHOFERES SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;

        const result = await executeQuery(query, queryParams);
        return NextResponse.json(result[0]);

    } catch (error) {
        console.error('[API_DRIVERS_PATCH]', error);
        return new NextResponse('Error al actualizar el chofer', { status: 500 });
    }
}