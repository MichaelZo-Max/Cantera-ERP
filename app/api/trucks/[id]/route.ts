// app/api/trucks/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { truckSchema } from '@/lib/validations';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
    
    // ✨ Usar las columnas correctas que necesita el frontend
    const query = "SELECT id, placa, brand, model, capacity, is_active FROM RIP.APP_CAMIONES WHERE id = @id";
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
 * @route   PATCH /api/trucks/[id]
 * @desc    Actualizar un camión
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de camión inválido.", { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    // 1. Crear esquema para PATCH que es consistente con el `truckSchema`
    const patchSchema = truckSchema.partial().extend({
      is_active: z.boolean().optional(),
    });

    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 2. Usar los nombres de campo CORRECTOS: `placa` y `capacity`
    const { placa, brand, model, capacity, is_active } = validation.data;

    if (Object.keys(validation.data).length === 0) {
      return new NextResponse("No se proporcionaron datos para actualizar.", { status: 400 });
    }
    
    // ✨ 3. Actualizar la consulta SQL para usar las columnas correctas
    const query = `
      UPDATE RIP.APP_CAMIONES
      SET 
          placa = ISNULL(@placa, placa),
          brand = ISNULL(@brand, brand),
          model = ISNULL(@model, model),
          capacity = ISNULL(@capacity, capacity),
          is_active = ISNULL(@is_active, is_active),
          updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id;
    `;
    
    // ✨ 4. Pasar los parámetros correctos a la consulta
    const result = await executeQuery(query, [
        { name: "id", type: TYPES.Int, value: id },
        { name: "placa", type: TYPES.NVarChar, value: placa },
        { name: "brand", type: TYPES.NVarChar, value: brand },
        { name: "model", type: TYPES.NVarChar, value: model },
        { name: "capacity", type: TYPES.Decimal, value: capacity },
        { name: "is_active", type: TYPES.Bit, value: is_active },
    ]);

    if (result.length === 0) {
      return new NextResponse("Camión no encontrado.", { status: 404 });
    }

    revalidateTag("trucks");
    
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("[API_TRUCKS_PATCH]", error);
    if (error.message && error.message.includes("Violation of UNIQUE KEY constraint")) {
         return new NextResponse(
           JSON.stringify({ placa: ["La placa ingresada ya existe."] }),
           { status: 409, headers: { "Content-Type": "application/json" } }
         );
    }
    return new NextResponse("Error al actualizar el camión.", { status: 500 });
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
        
        revalidateTag('trucks');

        return NextResponse.json({ message: 'Camión desactivado correctamente' });
    } catch (error) {
        console.error('[API_TRUCKS_DELETE]', error);
        return new NextResponse('Error al desactivar el camión', { status: 500 });
    }
}