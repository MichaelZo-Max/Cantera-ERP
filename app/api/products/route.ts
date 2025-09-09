// app/api/products/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";

type RawBody = Record<string, any>;
function pickFirst<T = any>(
  obj: RawBody,
  keys: string[],
  fallback?: T
): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
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
      nombre: r.DESCRIPCION ?? "",
      refProveedor: r.REFPROVEEDOR ?? null,
      description: r.description ?? null,
      unidad: r.UNIDADMEDIDA ?? null,
      usaStocks: String(r.USASTOCKS ?? "F").toUpperCase() === "T",
      is_active: String(r.DESCATALOGADO ?? "F").toUpperCase() !== "T",
      createdAt: r.FECHAMODIFICADO ?? new Date(),
      updatedAt: r.FECHAMODIFICADO ?? new Date(),
      precioUnitario:
        r.PRECIO_UNITARIO != null ? Number(r.PRECIO_UNITARIO) : null,
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.error("[API_PRODUCTS_GET]", error);
    return new NextResponse("Error al obtener productos", { status: 500 });
  }
}

/**
 * @route   POST /api/products
 * @desc    Crear un artículo en dbo.ARTICULOS.
 * Front mínimo: { nombre, refProveedor }
 */
export async function POST(req: Request) {
  try {
    const body: RawBody = await req.json().catch(() => ({}));

    let id = pickFirst<number>(body, ["id", "codArticulo", "codarticulo"]);
    const nombre = (pickFirst<string>(body, ["nombre", "descripcion"]) ?? "").toString().trim();
    const refProveedor = pickFirst<string>(body, ["refProveedor"]);
    let is_active: boolean | undefined = pickFirst<boolean>(body, ["is_active"]);

    if (!nombre) {
      return new NextResponse("El nombre es obligatorio", { status: 400 });
    }

    const descatalogadoTF = is_active ?? true ? "F" : "T";

    if (id == null) {
      const next = await executeQuery<{ nextId: number }>(
        `SELECT ISNULL(MAX(CODARTICULO), 0) + 1 AS nextId FROM dbo.ARTICULOS;`
      );
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
      { name: "id", type: TYPES.Int, value: id },
      { name: "descripcion", type: TYPES.NVarChar, value: nombre, options: { length: 250 } },
      { name: "refProveedor", type: TYPES.NVarChar, value: refProveedor ?? null, options: { length: 100 } },
      { name: "descatalogado", type: TYPES.NVarChar, value: descatalogadoTF, options: { length: 1 } },
    ];

    const rows = await executeQuery<any>(insertSql, params);
    const r = rows[0];

    return NextResponse.json(
      {
        id: r.CODARTICULO.toString(),
        nombre: r.DESCRIPCION ?? "",
        refProveedor: r.REFPROVEEDOR ?? null,
        is_active: String(r.DESCATALOGADO ?? "F").toUpperCase() !== "T",
        createdAt: r.FECHAMODIFICADO ?? new Date(),
        updatedAt: r.FECHAMODIFICADO ?? new Date(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      return new NextResponse("Producto duplicado (CODARTICULO ya existe)", {
        status: 409,
      });
    }
    console.error("[API_PRODUCTS_POST]", error);
    return new NextResponse("Error al crear producto", { status: 500 });
  }
}