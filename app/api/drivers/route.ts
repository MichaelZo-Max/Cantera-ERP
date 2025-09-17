// app/api/drivers/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * @route   GET /api/drivers
 * @desc    Obtener todos los choferes y sus clientes asociados.
 */
export async function GET() {
  try {
    // Consulta mejorada con LEFT JOIN y agregación JSON
    const query = `
      SELECT
        d.id,
        d.name,
        d.docId,
        d.phone,
        d.is_active,
        -- Usamos JSON_QUERY para construir un array de los clientes asociados
        (
          SELECT c.id, c.name
          FROM RIP.VW_APP_CLIENTES c
          JOIN RIP.APP_CLIENTES_CHOFERES cc ON c.id = cc.cliente_id
          WHERE cc.chofer_id = d.id
          FOR JSON PATH
        ) AS clients
      FROM RIP.APP_CHOFERES d
      ORDER BY d.name;
    `;
    const driversData = await executeQuery(query);

    // Parseamos el string JSON a un objeto
    const drivers = driversData.map((driver: any) => ({
      ...driver,
      clients: driver.clients ? JSON.parse(driver.clients) : [],
    }));

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("[API_DRIVERS_GET]", error);
    return new NextResponse("Error al obtener choferes", { status: 500 });
  }
}

/**
 * @route   POST /api/drivers
 * @desc    Crear un nuevo chofer y asociarlo a una lista de clientes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Esperamos `customer_ids` como un array. Si no viene, es un array vacío.
    const { name, docId, phone, is_active, customer_ids = [] } = body;

    if (!name) {
      return new NextResponse("El nombre es requerido", { status: 400 });
    }

    // Paso 1: Insertar el chófer en la tabla principal
    const createDriverQuery = `
        INSERT INTO RIP.APP_CHOFERES (name, docId, phone, is_active)
        OUTPUT INSERTED.id
        VALUES (@name, @docId, @phone, @is_active);
    `;
    const driverResult = await executeQuery(createDriverQuery, [
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "docId", type: TYPES.NVarChar, value: docId ?? null },
      { name: "phone", type: TYPES.NVarChar, value: phone ?? null },
      { name: "is_active", type: TYPES.Bit, value: is_active ?? true },
    ]);

    const driver_id = driverResult[0].id;

    // Paso 2: Si se enviaron IDs de clientes, los insertamos en la tabla de unión
    if (customer_ids.length > 0) {
      for (const customerId of customer_ids) {
        const linkQuery = `
            INSERT INTO RIP.APP_CLIENTES_CHOFERES (chofer_id, cliente_id)
            VALUES (@chofer_id, @cliente_id);
        `;
        await executeQuery(linkQuery, [
          { name: "chofer_id", type: TYPES.Int, value: driver_id },
          { name: "cliente_id", type: TYPES.Int, value: customerId },
        ]);
      }
    }

    revalidateTag("drivers");

    // Devolvemos el chófer creado para consistencia
    const newDriver = {
      id: driver_id,
      name,
      docId,
      phone,
      is_active: is_active ?? true,
    };

    return NextResponse.json(newDriver, { status: 201 });
  } catch (error) {
    console.error("[API_DRIVERS_POST]", error);
    return new NextResponse("Error al crear el chofer", { status: 500 });
  }
}
