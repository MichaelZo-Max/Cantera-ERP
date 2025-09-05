// app/api/deliveries/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';


export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

    const formData = await request.formData();
    const estado = formData.get('estado') as string;
    const loadedQuantity = formData.get('loadedQuantity') as string;
    const notes = formData.get('notes') as string | null;
    const userId = formData.get('userId') as string;
    const photoFile = formData.get('photoFile') as File | null;

    // --- LÓGICA PARA GUARDAR LA FOTO ---
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

    let sql = '';
    const p: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

    if (estado === 'CARGADA') {
        if (!userId) return new NextResponse('ID de usuario requerido', { status: 400 });
        sql = `UPDATE RIP.APP_DESPACHOS
               SET status='CARGADA',
                   loaded_quantity=@qty,
                   loaded_by=@userId,
                   loaded_at=GETDATE(),
                   notes=ISNULL(@notes, notes),
                   ${photoUrl ? 'load_photo_url=@photoUrl,' : ''}
                   updated_at=GETDATE()
               WHERE id=@id`;
        p.push({ name: 'qty', type: TYPES.Decimal, value: Number(loadedQuantity ?? 0), options: { precision: 18, scale: 2 } });
        p.push({ name: 'notes', type: TYPES.NVarChar, value: notes ?? null });
        p.push({ name: 'userId', type: TYPES.Int, value: parseInt(userId, 10) });
        if (photoUrl) {
          p.push({ name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl });
        }
    } else if (estado === 'SALIDA_OK') {
        if (!userId) return new NextResponse('ID de usuario requerido', { status: 400 });
        sql = `UPDATE RIP.APP_DESPACHOS
               SET status='SALIDA_OK',
                   exited_by=@userId,
                   exited_at=GETDATE(),
                   notes=ISNULL(@notes, notes),
                   ${photoUrl ? 'exit_photo_url=@photoUrl,' : ''}
                   updated_at=GETDATE()
               WHERE id=@id`;
        p.push({ name: 'notes', type: TYPES.NVarChar, value: notes ?? null });
        p.push({ name: 'userId', type: TYPES.Int, value: parseInt(userId, 10) });
         if (photoUrl) {
          p.push({ name: 'photoUrl', type: TYPES.NVarChar, value: photoUrl });
        }
    } else if (estado === 'RECHAZADA') {
        sql = `UPDATE RIP.APP_DESPACHOS
               SET status='RECHAZADA',
                   notes=ISNULL(@notes, notes),
                   updated_at=GETDATE()
               WHERE id=@id`;
        p.push({ name: 'notes', type: TYPES.NVarChar, value: notes ?? null });
    } else {
        return new NextResponse('Estado inválido', { status: 400 });
    }

    await executeQuery(sql, p);
    return NextResponse.json({ id, estado });
  } catch (e) {
    console.error('[API_DELIVERIES_PATCH]', e);
    return new NextResponse('Error al actualizar el despacho', { status: 500 });
  }
}