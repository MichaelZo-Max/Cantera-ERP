// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/** GET /api/products/[id] */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

    const sql = `
      SELECT
        A.CODARTICULO,
        A.DESCRIPCION,
        A.REFPROVEEDOR,
        A.UNIDADMEDIDA,
        A.USASTOCKS,
        A.DESCATALOGADO,
        A.FECHAMODIFICADO,
        A.FAMILIA AS CATEGORIA_O_AREA,
        MAX(AL.PRECIO) AS PRECIO_UNITARIO
      FROM dbo.ARTICULOS A
      LEFT JOIN dbo.ALBVENTALIN AL ON AL.CODARTICULO = A.CODARTICULO
      WHERE A.CODARTICULO = @id
      GROUP BY
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR, A.UNIDADMEDIDA,
        A.USASTOCKS, A.DESCATALOGADO, A.FECHAMODIFICADO, A.FAMILIA;
    `;
    const rows = await executeQuery<any>(sql, [{ name: 'id', type: TYPES.Int, value: id }]);
    if (rows.length === 0) return new NextResponse('Producto no encontrado', { status: 404 });

    const r = rows[0];
    return NextResponse.json({
      id: r.CODARTICULO,
      nombre: r.DESCRIPCION ?? '',
      codigoProveedor: r.REFPROVEEDOR ?? null,
      unidad: r.UNIDADMEDIDA ?? null,
      usaStocks: String(r.USASTOCKS ?? 'F').toUpperCase() === 'T',
      isActive: String(r.DESCATALOGADO ?? 'F').toUpperCase() !== 'T',
      fechaModificado: r.FECHAMODIFICADO ?? null,
      categoriaArea: r.CATEGORIA_O_AREA ?? null,
      precioUnitario: r.PRECIO_UNITARIO != null ? Number(r.PRECIO_UNITARIO) : null,
    });
  } catch (error) {
    console.error('[API_PRODUCTS_GET_BY_ID]', error);
    return new NextResponse('Error al obtener el producto', { status: 500 });
  }
}

/** PATCH /api/products/[id] */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

    const body = await req.json().catch(() => ({} as any));

    const nombre: string | undefined = body?.nombre !== undefined ? String(body.nombre).trim() : undefined;
    const codigoProveedor: string | undefined =
      body?.codigoProveedor !== undefined ? String(body.codigoProveedor).trim() :
      (body?.refProveedor !== undefined ? String(body.refProveedor).trim() : undefined);
    const unidad: string | undefined =
      body?.unidad !== undefined ? String(body.unidad).trim() :
      (body?.unidadMedida !== undefined ? String(body.unidadMedida).trim() : undefined);

    const usaStocks: boolean | undefined =
      typeof body?.usaStocks === 'boolean' ? body.usaStocks :
      (typeof body?.USASTOCKS === 'string' ? body.USASTOCKS.toUpperCase() === 'T' : undefined);

    const isActive: boolean | undefined =
      typeof body?.is_active === 'boolean' ? body.is_active :
      (typeof body?.isActive === 'boolean' ? body.isActive : undefined);

    const sets: string[] = [];
    const paramsArr: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

    if (nombre !== undefined) {
      sets.push('DESCRIPCION = @nombre');
      paramsArr.push({ name: 'nombre', type: TYPES.NVarChar, value: nombre || null, options: { length: 250 } });
    }
    if (codigoProveedor !== undefined) {
      sets.push('REFPROVEEDOR = @refProveedor');
      paramsArr.push({ name: 'refProveedor', type: TYPES.NVarChar, value: codigoProveedor || null, options: { length: 100 } });
    }
    if (unidad !== undefined) {
      sets.push('UNIDADMEDIDA = @unidad');
      paramsArr.push({ name: 'unidad', type: TYPES.NVarChar, value: unidad || null, options: { length: 20 } });
    }
    if (usaStocks !== undefined) {
      sets.push('USASTOCKS = @usaStocks');
      paramsArr.push({ name: 'usaStocks', type: TYPES.NVarChar, value: usaStocks ? 'T' : 'F', options: { length: 1 } });
    }
    if (isActive !== undefined) {
      sets.push('DESCATALOGADO = @desc');
      paramsArr.push({ name: 'desc', type: TYPES.NVarChar, value: isActive ? 'F' : 'T', options: { length: 1 } });
    }

    if (sets.length === 0) {
      // devolver el actual
      return await GET(req, { params });
    }

    sets.push('FECHAMODIFICADO = GETDATE()');

    const updateSql = `
      UPDATE dbo.ARTICULOS
      SET ${sets.join(', ')}
      WHERE CODARTICULO = @id;

      SELECT
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR, A.UNIDADMEDIDA,
        A.USASTOCKS, A.DESCATALOGADO, A.FECHAMODIFICADO, A.FAMILIA AS CATEGORIA_O_AREA,
        MAX(AL.PRECIO) AS PRECIO_UNITARIO
      FROM dbo.ARTICULOS A
      LEFT JOIN dbo.ALBVENTALIN AL ON AL.CODARTICULO = A.CODARTICULO
      WHERE A.CODARTICULO = @id
      GROUP BY
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR, A.UNIDADMEDIDA,
        A.USASTOCKS, A.DESCATALOGADO, A.FECHAMODIFICADO, A.FAMILIA;
    `;
    const rows = await executeQuery<any>(updateSql, paramsArr);
    const r = rows[0];
    if (!r) return new NextResponse('Producto no encontrado para actualizar', { status: 404 });

    return NextResponse.json({
      id: r.CODARTICULO,
      nombre: r.DESCRIPCION ?? '',
      codigoProveedor: r.REFPROVEEDOR ?? null,
      unidad: r.UNIDADMEDIDA ?? null,
      usaStocks: String(r.USASTOCKS ?? 'F').toUpperCase() === 'T',
      isActive: String(r.DESCATALOGADO ?? 'F').toUpperCase() !== 'T',
      fechaModificado: r.FECHAMODIFICADO ?? null,
      categoriaArea: r.CATEGORIA_O_AREA ?? null,
      precioUnitario: r.PRECIO_UNITARIO != null ? Number(r.PRECIO_UNITARIO) : null,
    });
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      return new NextResponse('Conflicto de duplicado en ARTICULOS', { status: 409 });
    }
    console.error('[API_PRODUCTS_PATCH]', error);
    return new NextResponse('Error al actualizar el producto', { status: 500 });
  }
}

/** DELETE /api/products/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return new NextResponse('ID inválido', { status: 400 });

    await executeQuery(
      `UPDATE dbo.ARTICULOS SET DESCATALOGADO = 'T', FECHAMODIFICADO = GETDATE() WHERE CODARTICULO = @id;`,
      [{ name: 'id', type: TYPES.Int, value: id }]
    );

    return NextResponse.json({ message: 'Producto desactivado correctamente', id });
  } catch (error) {
    console.error('[API_PRODUCTS_DELETE]', error);
    return new NextResponse('Error al desactivar el producto', { status: 500 });
  }
}
