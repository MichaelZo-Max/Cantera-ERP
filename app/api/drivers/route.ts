// app/api/drivers/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * @route   GET /api/drivers
 * @desc    Obtener todos los choferes desde la tabla RIP.APP_CHOFERES.
 */
export async function GET() {
  try {
    const query = `
      SELECT id, name, docId, phone, is_active 
      FROM RIP.APP_CHOFERES 
      ORDER BY name;
    `;
    const drivers = await executeQuery(query);
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

    const driverId = driverResult[0].id;

    // Paso 2: Si se enviaron IDs de clientes, los insertamos en la tabla de unión
    if (customer_ids.length > 0) {
      for (const customerId of customer_ids) {
        const linkQuery = `
            INSERT INTO RIP.APP_CLIENTES_CHOFERES (chofer_id, cliente_id)
            VALUES (@chofer_id, @cliente_id);
        `;
        await executeQuery(linkQuery, [
          { name: "chofer_id", type: TYPES.Int, value: driverId },
          { name: "cliente_id", type: TYPES.Int, value: customerId },
        ]);
      }
    }
    
    revalidateTag("drivers");

    // Devolvemos el chófer creado para consistencia
    const newDriver = {
        id: driverId,
        name,
        docId,
        phone,
        is_active: is_active ?? true
    };

    return NextResponse.json(newDriver, { status: 201 });
  } catch (error) {
    console.error("[API_DRIVERS_POST]", error);
    return new NextResponse("Error al crear el chofer", { status: 500 });
  }
}