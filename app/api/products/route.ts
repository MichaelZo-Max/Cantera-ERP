// app/api/products/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic'

/**
 * @route   GET /api/products
 * @desc    Lista productos activos desde la vista VW_APP_PRODUCTOS.
 */
export async function GET() {
  try {
    const sql = `
      SELECT
        id,
        codigo,
        name,
        description,
        price_per_unit,
        unit,
        is_active
      FROM RIP.VW_APP_PRODUCTOS
      WHERE is_active = 1
      ORDER BY name ASC;
    `;
    const rows = await executeQuery<any>(sql);

    const out = rows.map((r: any) => ({
      id: r.id.toString(),
      nombre: r.name ?? "",
      refProveedor: r.codigo ?? null,
      description: r.description ?? null,
      price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : 0,
      unit: r.unit ?? null,
      is_active: r.is_active,
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.error("[API_PRODUCTS_GET]", error);
    return new NextResponse("Error al obtener productos", { status: 500 });
  }
}

// La función POST ha sido eliminada.