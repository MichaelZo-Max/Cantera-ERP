// app/api/drivers/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { driverSchema } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * @route   GET /api/drivers/[id]
 * @desc    Obtener un chófer específico y los clientes asociados.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de chófer inválido", { status: 400 });
    }

    // Consulta para obtener los datos del chófer
    const driverQuery = `SELECT * FROM RIP.APP_CHOFERES WHERE id = @id;`;
    const driverResult = await executeQuery(driverQuery, [{ name: "id", type: TYPES.Int, value: id }]);

    if (driverResult.length === 0) {
      return new NextResponse("Chófer no encontrado", { status: 404 });
    }
    
    const driver = driverResult[0];

    // Consulta para obtener los clientes asociados desde la tabla de unión
    const customersQuery = `
        SELECT c.id, c.name 
        FROM RIP.VW_APP_CLIENTES c
        JOIN RIP.APP_CLIENTES_CHOFERES cc ON c.id = cc.cliente_id
        WHERE cc.chofer_id = @id;
    `;
    const customersResult = await executeQuery(customersQuery, [{ name: "id", type: TYPES.Int, value: id }]);

    // Combinamos los resultados en un solo objeto
    const populatedDriver = {
        ...driver,
        customers: customersResult, // Añadimos el array de clientes
    };

    return NextResponse.json(populatedDriver);

  } catch (error) {
    console.error(`[API_DRIVERS_ID_GET]`, error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

/**
 * @route   PATCH /api/drivers/[id]
 * @desc    Actualizar un chofer y sus asociaciones de clientes.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de chofer inválido.", { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    // ✨ 1. Definir un esquema para PATCH que hace todos los campos opcionales
    // y añade el campo `is_active`.
    const patchSchema = driverSchema.partial().extend({
      is_active: z.boolean().optional(),
    });

    // ✨ 2. Validar el body de la petición con el esquema de Zod.
    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      // Si la validación falla, devuelve los errores en formato JSON.
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 3. Usar los datos ya validados y limpios.
    const { name, docId, phone, is_active, customer_ids } = validation.data;

    // Si no hay datos para actualizar (excepto `customer_ids`), no tiene sentido continuar.
    if (Object.keys(validation.data).length === 0) {
        return new NextResponse(
          JSON.stringify({ message: "No se proporcionaron datos para actualizar." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Paso 4: Actualizar los datos principales del chofer en la DB.
    // La consulta SQL ya maneja correctamente los valores nulos o no definidos.
    const updateQuery = `
        UPDATE RIP.APP_CHOFERES
        SET 
            name = ISNULL(@name, name),
            docId = ISNULL(@docId, docId),
            phone = ISNULL(@phone, phone),
            is_active = ISNULL(@is_active, is_active),
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id;
    `;
    const updateResult = await executeQuery(updateQuery, [
      { name: "id", type: TYPES.Int, value: id },
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "docId", type: TYPES.NVarChar, value: docId },
      { name: "phone", type: TYPES.NVarChar, value: phone },
      { name: "is_active", type: TYPES.Bit, value: is_active },
    ]);

    if (updateResult.length === 0) {
      return new NextResponse("Chofer no encontrado para actualizar.", {
        status: 404,
      });
    }

    // Si se envió el array 'customer_ids', actualizamos las asociaciones.
    // Esto se ejecuta solo si el campo está presente en el body, incluso si es un array vacío.
    if (Array.isArray(customer_ids)) {
      // Borrar todas las asociaciones existentes para este chofer
      const deleteLinksQuery = `DELETE FROM RIP.APP_CLIENTES_CHOFERES WHERE chofer_id = @id;`;
      await executeQuery(deleteLinksQuery, [
        { name: "id", type: TYPES.Int, value: id },
      ]);

      // Insertar las nuevas asociaciones si el array no está vacío
      if (customer_ids.length > 0) {
        for (const customerId of customer_ids) {
          const linkQuery = `
              INSERT INTO RIP.APP_CLIENTES_CHOFERES (chofer_id, cliente_id)
              VALUES (@chofer_id, @cliente_id);
          `;
          await executeQuery(linkQuery, [
            { name: "chofer_id", type: TYPES.Int, value: id },
            { name: "cliente_id", type: TYPES.Int, value: customerId },
          ]);
        }
      }
    }

    revalidateTag("drivers");

    return NextResponse.json(updateResult[0]);
  } catch (error) {
    console.error("[API_DRIVERS_PATCH]", error);
    return new NextResponse("Error interno al actualizar el chofer.", {
      status: 500,
    });
  }
}

/**
 * @route   DELETE /api/drivers/[id]
 * @desc    Desactivar un chofer (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de chofer inválido", { status: 400 });
    }

    const query = `
        UPDATE RIP.APP_CHOFERES
        SET is_active = 0, updated_at = GETDATE()
        WHERE id = @id;
    `;
    await executeQuery(query, [{ name: "id", type: TYPES.Int, value: id }]);

    revalidateTag("drivers");

    return NextResponse.json({ message: "Chofer desactivado correctamente" });
  } catch (error) {
    console.error(`[API_DRIVERS_DELETE]`, error);
    return new NextResponse("Error al desactivar el chofer", { status: 500 });
  }
}