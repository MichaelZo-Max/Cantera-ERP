// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

type RawBody = Record<string, any>;
function pickFirst<T = any>(obj: RawBody, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
  }
  return fallback;
}

/**
 * @route   GET /api/products
 * @desc    Lista productos activos (DESCATALOGADO='F'), con stock (USASTOCKS='T') y datos extendidos.
 */
export async function GET() {
  try {
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
      LEFT JOIN dbo.ALBVENTALIN AL
        ON AL.CODARTICULO = A.CODARTICULO
      WHERE A.DESCATALOGADO = 'F'
        AND A.USASTOCKS = 'T'
      GROUP BY
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR, A.UNIDADMEDIDA,
        A.USASTOCKS, A.DESCATALOGADO, A.FECHAMODIFICADO, A.FAMILIA
      ORDER BY A.DESCRIPCION ASC;
    `;
    const rows = await executeQuery<any>(sql);

    const out = rows.map((r: any) => ({
      id: r.CODARTICULO,
      nombre: r.DESCRIPCION ?? '',
      codigoProveedor: r.REFPROVEEDOR ?? null,
      unidad: r.UNIDADMEDIDA ?? null,
      usaStocks: String(r.USASTOCKS ?? 'F').toUpperCase() === 'T',
      isActive: String(r.DESCATALOGADO ?? 'F').toUpperCase() !== 'T',
      fechaModificado: r.FECHAMODIFICADO ?? null,
      categoriaArea: r.CATEGORIA_O_AREA ?? null,
      precioUnitario: r.PRECIO_UNITARIO != null ? Number(r.PRECIO_UNITARIO) : null,
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.error('[API_PRODUCTS_GET]', error);
    return new NextResponse('Error al obtener productos', { status: 500 });
  }
}

/**
 * @route   POST /api/products
 * @desc    Crear un artículo en dbo.ARTICULOS.
 *          Front mínimo: { nombre, codigoProveedor, unidad, usaStocks, is_active }
 *          Opcional: id (si falta => MAX+1)
 */
export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    const body: RawBody = ct.includes('application/json') ? await req.json().catch(() => ({})) : {};

    let id = pickFirst<number>(body, ['id', 'codArticulo', 'codarticulo', 'codigo', 'code']);
    const nombre = (pickFirst<string>(body, ['nombre', 'descripcion', 'DESCRIPCION']) ?? '').toString().trim();
    const codigoProveedor = pickFirst<string>(body, ['codigoProveedor', 'refProveedor', 'REFPROVEEDOR']);
    const unidad = pickFirst<string>(body, ['unidad', 'unidadMedida', 'UNIDADMEDIDA']);
    let usaStocks: boolean | undefined =
      typeof body?.usaStocks === 'boolean' ? body.usaStocks :
      (typeof body?.USASTOCKS === 'string' ? body.USASTOCKS.toUpperCase() === 'T' : undefined);
    let isActive: boolean | undefined =
      typeof body?.is_active === 'boolean' ? body.is_active :
      (typeof body?.isActive === 'boolean' ? body.isActive : undefined);

    if (!nombre) return new NextResponse('El campo nombre/descripción es obligatorio', { status: 400 });

    // Defaults
    const usaStocksTF = (usaStocks ?? true) ? 'T' : 'F';
    const descatalogadoTF = (isActive ?? true) ? 'F' : 'T';
    const unidadVal = (unidad ?? 'unidad').toString().trim(); // default razonable

    if (id == null) {
      const next = await executeQuery<{ nextId: number }>(`SELECT ISNULL(MAX(CODARTICULO), 0) + 1 AS nextId FROM dbo.ARTICULOS;`);
      id = next[0]?.nextId ?? 1;
    }

    const insertSql = `
      INSERT INTO dbo.ARTICULOS (
        CODARTICULO, DESCRIPCION, REFPROVEEDOR, UNIDADMEDIDA,
        USASTOCKS, DESCATALOGADO, FECHAMODIFICADO
      )
      VALUES (
        @id, @descripcion, @refProveedor, @unidad,
        @usaStocks, @descatalogado, GETDATE()
      );

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
    const params = [
      { name: 'id',            type: TYPES.Int,       value: id },
      { name: 'descripcion',   type: TYPES.NVarChar,  value: nombre,          options: { length: 250 } },
      { name: 'refProveedor',  type: TYPES.NVarChar,  value: codigoProveedor ?? null, options: { length: 100 } },
      { name: 'unidad',        type: TYPES.NVarChar,  value: unidadVal,       options: { length: 20 } },
      { name: 'usaStocks',     type: TYPES.NVarChar,  value: usaStocksTF,     options: { length: 1 } },
      { name: 'descatalogado', type: TYPES.NVarChar,  value: descatalogadoTF, options: { length: 1 } },
    ];

    const rows = await executeQuery<any>(insertSql, params);
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
    }, { status: 201 });
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      return new NextResponse('Producto duplicado (CODARTICULO ya existe)', { status: 409 });
    }
    console.error('[API_PRODUCTS_POST]', error);
    return new NextResponse('Error al crear producto', { status: 500 });
  }
}