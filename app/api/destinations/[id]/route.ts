// app/api/destinations/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod"; // ✨ 1. Importar Zod
import { destinationSchema } from "@/lib/validations"; // ✨ 2. Importar el esquema base

export const dynamic = "force-dynamic";

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

    const body = await request.json().catch(() => ({}));

    // ✨ 3. Crear esquema para PATCH: hace opcionales los campos del formulario y añade `is_active`.
    const patchSchema = destinationSchema.partial().extend({
      is_active: z.boolean().optional(),
    });

    // ✨ 4. Validar el body con Zod.
    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 5. Usar los datos ya validados y limpios en tu lógica original.
    const { name, address, customer_id, is_active } = validation.data;

    const updates: string[] = [];
    const queryParams: any[] = [{ name: "id", type: TYPES.Int, value: id }];

    // Construir la consulta dinámicamente con los datos validados.
    if (name !== undefined) {
      updates.push("name = @name");
      queryParams.push({
        name: "name",
        type: TYPES.NVarChar,
        value: name,
      });
    }
    if (address !== undefined) {
      updates.push("address = @address");
      queryParams.push({
        name: "address",
        type: TYPES.NVarChar,
        value: address,
      });
    }
    if (customer_id !== undefined) {
      updates.push("customer_id = @customer_id");
      queryParams.push({
        name: "customer_id",
        type: TYPES.Int,
        value: customer_id,
      });
    }
    if (is_active !== undefined) {
      updates.push("is_active = @is_active");
      queryParams.push({
        name: "is_active",
        type: TYPES.Bit,
        value: is_active,
      });
    }

    if (updates.length === 0) {
      // Si no hay nada que actualizar, se devuelve el status actual.
      return GET(request, { params });
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

    revalidateTag("destinations");

    // Devolver el objeto completo con el nombre del cliente para consistencia
    const updatedDestinationData = result[0];
    const clientQuery = `SELECT name as name FROM RIP.VW_APP_CLIENTES WHERE id = @customer_id`;
    const clientResult = await executeQuery(clientQuery, [
      {
        name: "customer_id",
        type: TYPES.Int,
        value: updatedDestinationData.customer_id,
      },
    ]);

    const finalResponse = {
      ...updatedDestinationData,
      client: {
        name: clientResult[0]?.name || null,
      },
    };

    return NextResponse.json(finalResponse);
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

    revalidateTag("destinations");

    return NextResponse.json({ message: "Destino desactivado correctamente" });
  } catch (error) {
    console.error("[API_DESTINATIONS_DELETE]", error);
    return new NextResponse("Error al desactivar el destino", { status: 500 });
  }
}
