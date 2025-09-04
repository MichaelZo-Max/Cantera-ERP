// app/api/deliveries/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

    const body = await request.json();
    const { estado, loadedQuantity, notes } = body as {
      estado: 'EN_CARGA' | 'CARGADA' | 'SALIDA_OK' | 'RECHAZADA',
      loadedQuantity?: number,
      notes?: string
    };

    let sql = '';
    const p: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

    if (estado === 'EN_CARGA') {
      sql = `UPDATE RIP.APP_DESPACHOS
             SET status='EN_CARGA', updated_at=GETDATE()
             WHERE id=@id`;
    } else if (estado === 'CARGADA') {
      sql = `UPDATE RIP.APP_DESPACHOS
             SET status='CARGADA',
                 loaded_quantity=@qty,
                 loaded_by=1,
                 loaded_at=GETDATE(),
                 notes=ISNULL(@notes, notes),
                 updated_at=GETDATE()
             WHERE id=@id`;
      p.push({ name: 'qty', type: TYPES.Decimal, value: loadedQuantity ?? 0, options: { precision: 18, scale: 2 } });
      p.push({ name: 'notes', type: TYPES.NVarChar, value: notes ?? null });
    } else if (estado === 'SALIDA_OK') {
      sql = `UPDATE RIP.APP_DESPACHOS
             SET status='SALIDA_OK',
                 exited_by=1,
                 exited_at=GETDATE(),
                 notes=ISNULL(@notes, notes),
                 updated_at=GETDATE()
             WHERE id=@id`;
      p.push({ name: 'notes', type: TYPES.NVarChar, value: notes ?? null });
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
