// app/api/deliveries/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const despachoId = parseInt(params.id, 10);
    if (isNaN(despachoId)) return new NextResponse('ID de despacho inválido', { status: 400 });

    const formData = await request.formData();
    const status = formData.get('status') as string;
    const notes = formData.get('notes') as string | null;
    const userId = formData.get('userId') as string;
    const photoFile = formData.get('photoFile') as File | null;

    // --- LÓGICA DE FOTO ---
    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');

      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      
      photoUrl = `/uploads/${filename}`;
    }
    // --- FIN LÓGICA FOTO ---

    if (status === 'CARGADA') {
      const itemsJson = formData.get('items') as string;
      if (!userId || !itemsJson) return new NextResponse('Faltan datos para confirmar la carga', { status: 400 });

      const items: { pedido_item_id: string; dispatched_quantity: number }[] = JSON.parse(itemsJson);
      
      // --- TRANSACCIÓN PARA CONFIRMAR CARGA ---
      // Inicia una transacción manual con múltiples consultas
      await executeQuery('BEGIN TRANSACTION');
      
      try {
        // 1. Actualiza el despacho principal
        const updateDespachoQuery = `
          UPDATE RIP.APP_DESPACHOS
          SET status = 'CARGADA',
              loaded_by = @userId,
              loaded_at = GETDATE(),
              notes = ISNULL(@notes, notes),
              ${photoUrl ? 'load_photo_url = @photoUrl,' : ''}
              updated_at = GETDATE()
          WHERE id = @despachoId;
        `;
        const despachoParams = [
          { name: 'userId', type: TYPES.Int, value: parseInt(userId, 10) },
          { name: 'notes', type: TYPES.NVarChar, value: notes ?? null },
          { name: 'despachoId', type: TYPES.Int, value: despachoId }
        ];
        if (photoUrl) {
          despachoParams.push({ name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl });
        }
        await executeQuery(updateDespachoQuery, despachoParams);

        // 2. Inserta cada item cargado
        for (const item of items) {
          const insertItemQuery = `
            INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
            VALUES (@despachoId, @pedidoItemId, @quantity);
          `;
          const itemParams = [
            { name: 'despachoId', type: TYPES.Int, value: despachoId },
            { name: 'pedidoItemId', type: TYPES.Int, value: parseInt(item.pedido_item_id, 10) },
            { name: 'quantity', type: TYPES.Decimal, value: item.dispatched_quantity, options: { precision: 18, scale: 2 } },
          ];
          await executeQuery(insertItemQuery, itemParams);
        }

        // Si todo sale bien, confirma la transacción
        await executeQuery('COMMIT TRANSACTION');

      } catch (transactionError) {
        // Si algo falla, revierte todo
        await executeQuery('ROLLBACK TRANSACTION');
        throw transactionError; // Lanza el error para que sea capturado por el catch principal
      }

    } else if (status === 'SALIDA_OK') {
        if (!userId) return new NextResponse('ID de usuario requerido', { status: 400 });
        const sql = `UPDATE RIP.APP_DESPACHOS
               SET status='SALIDA_OK',
                   exited_by=@userId,
                   exited_at=GETDATE(),
                   notes=ISNULL(@notes, notes),
                   ${photoUrl ? 'exit_photo_url=@photoUrl,' : ''}
                   updated_at=GETDATE()
               WHERE id=@id`;
        const p = [
          { name: 'id', type: TYPES.Int, value: despachoId },
          { name: 'notes', type: TYPES.NVarChar, value: notes ?? null },
          { name: 'userId', type: TYPES.Int, value: parseInt(userId, 10) }
        ];
         if (photoUrl) {
          p.push({ name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl });
        }
        await executeQuery(sql, p);
    } else {
        return new NextResponse('Estado no manejado', { status: 400 });
    }

    revalidateTag('deliveries');
    revalidateTag('orders');

    const finalDeliveryState = await executeQuery('SELECT * FROM RIP.APP_DESPACHOS WHERE id = @id', [{ name: 'id', type: TYPES.Int, value: despachoId}]);

    return NextResponse.json(finalDeliveryState[0]);
  } catch (e) {
    console.error('[API_DELIVERIES_PATCH]', e);
    return new NextResponse('Error al actualizar el despacho', { status: 500 });
  }
}
