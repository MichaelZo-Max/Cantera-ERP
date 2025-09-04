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
        -- Un campo de descripción, puedes usar el mismo nombre o un campo específico si lo tienes
        A.DESCRIPCION AS description,
        MAX(AL.PRECIO) AS PRECIO_UNITARIO
      FROM dbo.ARTICULOS A
      LEFT JOIN dbo.ALBVENTALIN AL
        ON AL.CODARTICULO = A.CODARTICULO
      WHERE A.DESCATALOGADO = 'F'
        AND A.USASTOCKS = 'T'
      GROUP BY
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR, A.UNIDADMEDIDA,
        A.USASTOCKS, A.DESCATALOGADO, A.FECHAMODIFICADO
      ORDER BY A.DESCRIPCION ASC;
    `;
    const rows = await executeQuery<any>(sql);

    const out = rows.map((r: any) => ({
      id: r.CODARTICULO.toString(),
      nombre: r.DESCRIPCION ?? '',
      codigo: r.REFPROVEEDOR ?? null, // Renombrado de codigoProveedor a codigo
      description: r.description ?? null, // Nuevo campo añadido
      unidad: r.UNIDADMEDIDA ?? null,
      usaStocks: String(r.USASTOCKS ?? 'F').toUpperCase() === 'T',
      isActive: String(r.DESCATALOGADO ?? 'F').toUpperCase() !== 'T',
      createdAt: r.FECHAMODIFICADO ?? new Date(), // Mapeado a createdAt
      updatedAt: r.FECHAMODIFICADO ?? new Date(), // Mapeado a updatedAt
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
 * Front mínimo: { nombre, codigo }
 * Opcional: id (si falta => MAX+1)
 */
export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    const body: RawBody = ct.includes('application/json') ? await req.json().catch(() => ({})) : {};

    let id = pickFirst<number>(body, ['id', 'codArticulo', 'codarticulo', 'codigo', 'code']);
    const nombre = (pickFirst<string>(body, ['nombre', 'descripcion', 'DESCRIPCION']) ?? '').toString().trim();
    const codigo = pickFirst<string>(body, ['codigo', 'codigoProveedor', 'refProveedor', 'REFPROVEEDOR']);
    let isActive: boolean | undefined =
      typeof body?.is_active === 'boolean' ? body.is_active :
      (typeof body?.isActive === 'boolean' ? body.isActive : undefined);

    if (!nombre || !codigo) return new NextResponse('El nombre y el código son obligatorios', { status: 400 });

    // Defaults
    const descatalogadoTF = (isActive ?? true) ? 'F' : 'T';

    if (id == null) {
      const next = await executeQuery<{ nextId: number }>(`SELECT ISNULL(MAX(CODARTICULO), 0) + 1 AS nextId FROM dbo.ARTICULOS;`);
      id = next[0]?.nextId ?? 1;
    }

    const insertSql = `
      INSERT INTO dbo.ARTICULOS (
        CODARTICULO, DESCRIPCION, REFPROVEEDOR,
        DESCATALOGADO, FECHAMODIFICADO
      )
      VALUES (
        @id, @descripcion, @refProveedor,
        @descatalogado, GETDATE()
      );

      SELECT
        A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR,
        A.DESCATALOGADO, A.FECHAMODIFICADO
      FROM dbo.ARTICULOS A
      WHERE A.CODARTICULO = @id
    `;
    const params = [
      { name: 'id',            type: TYPES.Int,       value: id },
      { name: 'descripcion',   type: TYPES.NVarChar,  value: nombre,          options: { length: 250 } },
      { name: 'refProveedor',  type: TYPES.NVarChar,  value: codigo ?? null, options: { length: 100 } },
      { name: 'descatalogado', type: TYPES.NVarChar,  value: descatalogadoTF, options: { length: 1 } },
    ];

    const rows = await executeQuery<any>(insertSql, params);
    const r = rows[0];

    return NextResponse.json({
      id: r.CODARTICULO.toString(),
      nombre: r.DESCRIPCION ?? '',
      codigo: r.REFPROVEEDOR ?? null,
      isActive: String(r.DESCATALOGADO ?? 'F').toUpperCase() !== 'T',
      createdAt: r.FECHAMODIFICADO ?? new Date(),
      updatedAt: r.FECHAMODIFICADO ?? new Date(),
    }, { status: 201 });
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      return new NextResponse('Producto duplicado (CODARTICULO ya existe)', { status: 409 });
    }
    console.error('[API_PRODUCTS_POST]', error);
    return new NextResponse('Error al crear producto', { status: 500 });
  }
}