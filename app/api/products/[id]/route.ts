import { NextRequest, NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { errorHandler } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * Obtiene un producto específico por su CODARTICULO desde la base de datos.
 * @param id El CODARTICULO del producto.
 */
async function getProductById(id: number) {
  const sql = `
    SELECT
      A.CODARTICULO as id,
      A.REFPROVEEDOR as codigo,
      A.DESCRIPCION as name,
      ISNULL(PV.PNETO, 0) as price_per_unit,
      'Unidad' as unit, -- Unidades Hardcodeadas
      CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END as is_active
    FROM dbo.ARTICULOS A
    OUTER APPLY (
        SELECT TOP 1 PNETO
        FROM PRECIOSVENTA PV
        WHERE PV.CODARTICULO = A.CODARTICULO
    ) AS PV
    WHERE A.CODARTICULO = @id;
  `;
  
  const rows = await executeQuery<any>(sql, [
    { name: "id", type: TYPES.Int, value: id },
  ]);

  if (rows.length === 0) return null;

  const r = rows[0];
  // Mapeamos los datos para que coincidan con la estructura que espera el frontend
  return {
    id: r.id.toString(), // <-- CAMBIO CLAVE: Convertir el ID a string
    name: r.name ?? "",
    refProveedor: r.codigo ?? null,
    description: r.name ?? null, // Usamos 'name' como descripción
    price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : 0,
    unit: r.unit ?? "Unidad",
    is_active: r.is_active === 1,
  };
}


/** GET /api/products/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de producto inválido", { status: 400 });
    }

    const product = await getProductById(id);
    if (!product) {
      return new NextResponse("Producto no encontrado", { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("[API_PRODUCTS_GET_BY_ID]", error);
    return errorHandler(error);
  }
}

