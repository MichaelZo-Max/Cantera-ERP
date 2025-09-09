// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";

async function getProductById(id: number) {
  const sql = `
    SELECT
      A.CODARTICULO, A.DESCRIPCION, A.REFPROVEEDOR,
      A.DESCATALOGADO, A.FECHAMODIFICADO
    FROM dbo.ARTICULOS A
    WHERE A.CODARTICULO = @id;
  `;
  const rows = await executeQuery<any>(sql, [
    { name: "id", type: TYPES.Int, value: id },
  ]);
  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    id: r.CODARTICULO.toString(),
    nombre: r.DESCRIPCION ?? "",
    refProveedor: r.REFPROVEEDOR ?? "",
    description: r.DESCRIPCION ?? "",
    is_active: String(r.DESCATALOGADO ?? "F").toUpperCase() !== "T",
    createdAt: r.FECHAMODIFICADO ?? new Date(),
    updatedAt: r.FECHAMODIFICADO ?? new Date(),
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

/** PATCH /api/products/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id))
      return new NextResponse("ID inválido", { status: 400 });

    const body = await req.json().catch(() => ({} as any));

    const sets: string[] = [];
    const paramsArr: any[] = [{ name: "id", type: TYPES.Int, value: id }];

    if (body.nombre !== undefined) {
      sets.push("DESCRIPCION = @nombre");
      paramsArr.push({
        name: "nombre",
        type: TYPES.NVarChar,
        value: body.nombre,
      });
    } else if (body.description !== undefined) {
      sets.push("DESCRIPCION = @description");
      paramsArr.push({
        name: "description",
        type: TYPES.NVarChar,
        value: body.description,
      });
    }
    if (body.codigo !== undefined) {
      sets.push("REFPROVEEDOR = @codigo");
      paramsArr.push({
        name: "codigo",
        type: TYPES.NVarChar,
        value: body.codigo,
      });
    }
    if (body.is_active !== undefined) {
      sets.push("DESCATALOGADO = @descatalogado");
      paramsArr.push({
        name: "descatalogado",
        type: TYPES.NVarChar,
        value: body.is_active ? "F" : "T",
      });
    }

    if (sets.length === 0) {
      const currentProduct = await getProductById(id);
      return NextResponse.json(currentProduct);
    }

    sets.push("FECHAMODIFICADO = GETDATE()");

    const updateSql = `
      UPDATE dbo.ARTICULOS
      SET ${sets.join(", ")}
      WHERE CODARTICULO = @id;
    `;
    await executeQuery(updateSql, paramsArr);

    const updatedProduct = await getProductById(id);
    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      return new NextResponse(
        "Conflicto: El código ya existe para otro producto.",
        { status: 409 }
      );
    }
    console.error("[API_PRODUCTS_PATCH]", error);
    return new NextResponse("Error al actualizar el producto", { status: 500 });
  }
}