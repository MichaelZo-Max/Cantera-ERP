// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";

export const dynamic = 'force-dynamic'

async function getProductById(id: number) {
  const sql = `
    SELECT
      id, codigo, name,
      price_per_unit, unit, is_active
    FROM RIP.VW_APP_PRODUCTOS
    WHERE id = @id;
  `;
  const rows = await executeQuery<any>(sql, [
    { name: "id", type: TYPES.Int, value: id },
  ]);
  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    id: r.id.toString(),
    nombre: r.name ?? "",
    refProveedor: r.codigo ?? "",
    description: r.name ?? "", // Usar 'name' también para 'description'
    price_per_unit: r.price_per_unit ? Number(r.price_per_unit) : 0,
    unit: r.unit,
    is_active: r.is_active,
  };
}

/** GET /api/products/[id] */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id))
      return new NextResponse("ID inválido", { status: 400 });

    const product = await getProductById(id);
    if (!product)
      return new NextResponse("Producto no encontrado", { status: 404 });

    return NextResponse.json(product);
  } catch (error) {
    console.error("[API_PRODUCTS_GET_BY_ID]", error);
    return new NextResponse("Error al obtener el producto", { status: 500 });
  }
}