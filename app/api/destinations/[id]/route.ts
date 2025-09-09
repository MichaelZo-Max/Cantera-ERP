// app/api/destinations/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

/**
 * @route GET /api/destinations/[id]
 * @desc Obtener un destino por ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const query = "SELECT * FROM RIP.APP_DESTINOS WHERE id = @id";
    const result = await executeQuery(query, [
      { name: "id", type: TYPES.Int, value: params.id },
    ]);
    if (result.length === 0) {
      return new NextResponse("Destino no encontrado", { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[API_DESTINATIONS_GET_BY_ID]", error);
    return new NextResponse("Error al obtener el destino", { status: 500 });
  }
}

/**
 * @route PATCH /api/destinations/[id]
 * @desc Actualizar un destino dinámicamente
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de destino inválido", { status: 400 });
    }

    const body = await request.json();

    const updates: string[] = [];
    const queryParams: any[] = [{ name: "id", type: TYPES.Int, value: id }];

    // Construimos la consulta dinámicamente solo con los campos que vienen en el body
    if (body.nombre !== undefined) {
      updates.push("name = @name");
      queryParams.push({
        name: "name",
        type: TYPES.NVarChar,
        value: body.nombre,
      });
    }
    if (body.direccion !== undefined) {
      updates.push("address = @address");
      queryParams.push({
        name: "address",
        type: TYPES.NVarChar,
        value: body.direccion,
      });
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = @is_active");
      queryParams.push({
        name: "is_active",
        type: TYPES.Bit,
        value: body.is_active,
      });
    }

    // Si no hay nada que actualizar, devolvemos un error o el objeto actual
    if (updates.length === 0) {
      const currentDestination = await executeQuery(
        "SELECT * FROM RIP.APP_DESTINOS WHERE id = @id",
        [{ name: "id", type: TYPES.Int, value: id }]
      );
      if (currentDestination.length === 0) {
        return new NextResponse("Destino no encontrado", { status: 404 });
      }
      return NextResponse.json(currentDestination[0]);
    }

    updates.push("updated_at = GETDATE()");

    const query = `
            UPDATE RIP.APP_DESTINOS SET ${updates.join(", ")}
            OUTPUT INSERTED.*
            WHERE id = @id;
        `;

    const result = await executeQuery(query, queryParams);
    if (result.length === 0) {
      return new NextResponse("Destino no encontrado para actualizar", {
        status: 404,
      });
    }

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('destinations');

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[API_DESTINATIONS_PATCH]", error);
    return new NextResponse("Error al actualizar el destino", { status: 500 });
  }
}

/**
 * @route DELETE /api/destinations/[id]
 * @desc Desactivar un destino
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const query = `
            UPDATE RIP.APP_DESTINOS
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id;
        `;
    await executeQuery(query, [
      { name: "id", type: TYPES.Int, value: params.id },
    ]);
    
    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('destinations');

    return NextResponse.json({ message: "Destino desactivado correctamente" });
  } catch (error) {
    console.error("[API_DESTINATIONS_DELETE]", error);
    return new NextResponse("Error al desactivar el destino", { status: 500 });
  }
}
