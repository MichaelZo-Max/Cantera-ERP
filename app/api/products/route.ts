import { NextRequest, NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { errorHandler } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10); // Ajustado a 12 para que coincida con el frontend si es necesario
    const searchTerm = searchParams.get("q") || "";

    const offset = (page - 1) * limit;

    const params: any[] = [];
    // Filtramos por artículos activos usando la columna correcta
    let whereClauses = ["A.DESCATALOGADO = 'F'"]; 

    if (searchTerm) {
      // Buscamos en las columnas de la tabla base para máxima velocidad
      whereClauses.push(`(A.DESCRIPCION LIKE @searchTerm OR A.REFPROVEEDOR LIKE @searchTerm)`);
      params.push({
        name: "searchTerm",
        type: TYPES.NVarChar,
        value: `%${searchTerm}%`,
      });
    }
    
    // Unimos las cláusulas WHERE con A para evitar ambigüedad
    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // --- Consulta #1: Conteo total ---
    const countQuery = `SELECT COUNT(*) as total FROM dbo.ARTICULOS A ${whereClause}`;
    const countResult = await executeQuery<{ total: number }>(countQuery, params);
    const total = countResult[0]?.total ?? 0;

    // --- Consulta #2: Obtener la página de datos con los precios correctos ---
    const dataQuery = `
      SELECT
        A.CODARTICULO as id,
        A.REFPROVEEDOR as codigo,
        A.DESCRIPCION as name,
        -- Solución: Obtenemos el precio usando OUTER APPLY para eficiencia.
        -- ISNULL maneja los casos donde un producto podría no tener un precio asignado.
        ISNULL(PV.PNETO, 0) as price_per_unit,
        A.UNIDADMEDIDA as unit,
        CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END as is_active
      FROM dbo.ARTICULOS A
      OUTER APPLY (
          SELECT TOP 1 PNETO
          FROM PRECIOSVENTA PV
          WHERE PV.CODARTICULO = A.CODARTICULO
          -- Opcional: Si necesitas una tarifa de venta específica, puedes ordenarla aquí.
          -- Por ejemplo: ORDER BY PV.IDTARIFAV ASC
      ) AS PV
      ${whereClause}
      ORDER BY A.DESCRIPCION ASC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY;
    `;

    const queryParams = [
      ...params,
      { name: "offset", type: TYPES.Int, value: offset },
      { name: "limit", type: TYPES.Int, value: limit },
    ];
    
    const productRows = await executeQuery<any>(dataQuery, queryParams);

    // El mapeo de datos ya es compatible con la nueva consulta
    const mappedProducts = productRows.map((r: any) => ({
      id: r.id,
      name: r.name ?? "",
      refProveedor: r.codigo ?? null,
      description: r.name ?? null, 
      price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : 0,
      unit: r.unit ?? null,
      is_active: r.is_active === 1,
    }));

    return NextResponse.json({
      data: mappedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[API_PRODUCTS_GET]", error);
    return errorHandler(error);
  }
}