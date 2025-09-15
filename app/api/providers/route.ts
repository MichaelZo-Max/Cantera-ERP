// app/api/providers/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * @route GET /api/providers
 * @desc Obtener todos los proveedores activos.
 */
export async function GET() {
  try {
    const query = `
      SELECT
        CODPROVEEDOR,
        NOMPROVEEDOR
      FROM
        dbo.PROVEEDORES
      WHERE
        DESCATALOGADO = 'F'
      ORDER BY
        NOMPROVEEDOR ASC;
    `;
    const providers = await executeQuery(query);

    // Mapeamos a un formato más amigable para el frontend
    const out = providers.map((p: any) => ({
      id: p.CODPROVEEDOR,
      name: p.NOMPROVEEDOR,
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.error("[API_PROVIDERS_GET]", error);
    return new NextResponse("Error al obtener proveedores", { status: 500 });
  }
}
