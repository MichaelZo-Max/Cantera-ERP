// app/api/product-formats/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) return new NextResponse('ID de formato inválido', { status: 400 });

        const body = await request.json();
        
        const updates: string[] = [];
        const queryParams: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

        if (body.sku !== undefined) {
            updates.push("sku = @sku");
            queryParams.push({ name: 'sku', type: TYPES.NVarChar, value: body.sku });
        }
        if (body.price_per_unit !== undefined) {
            updates.push("price_per_unit = @price");
            queryParams.push({ name: 'price', type: TYPES.Decimal, value: body.price_per_unit });
        }
         if (body.is_active !== undefined) {
            updates.push("is_active = @is_active");
            queryParams.push({ name: 'is_active', type: TYPES.Bit, value: body.is_active });
        }
        
        if (updates.length === 0) {
           return new NextResponse('No hay campos para actualizar', { status: 400 });
        }

        updates.push("updated_at = GETDATE()");

        const query = `
            UPDATE RIP.APP_PRODUCTOS_FORMATOS SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;

        const result = await executeQuery(query, queryParams);
        return NextResponse.json(result[0]);

    } catch (error) {
        console.error('[API_FORMATS_PATCH]', error);
        return new NextResponse('Error al actualizar el formato', { status: 500 });
    }
}