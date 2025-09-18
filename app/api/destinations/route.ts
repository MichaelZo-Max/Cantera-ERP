// app/api/destinations/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { destinationSchema } from "@/lib/validations"; // ✨ 1. Importar el esquema

export const dynamic = "force-dynamic";

/**
 * @route GET /api/destinations
 * @desc Obtener destinos. Si se provee `customer_id`, filtra por cliente; sino, devuelve todos CON el nombre del cliente.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get("customer_id");

    let query: string;
    const params: any[] = [];

    if (customer_id) {
      // Flujo para el cajero: no necesita el nombre del cliente, se mantiene simple.
      query = `
        SELECT id, customer_id as customer_id, name AS name, address AS direccion, is_active
        FROM RIP.APP_DESTINOS
        WHERE customer_id = @customer_id AND is_active = 1
        ORDER BY name;
      `;
      params.push({
        name: "customer_id",
        type: TYPES.Int,
        value: parseInt(customer_id, 10),
      });
    } else {
      // Flujo para el admin. Se une para obtener el nombre del cliente.
      query = `
        SELECT
          d.id,
          d.customer_id as customer_id,
          d.name AS name,
          d.address AS direccion,
          d.is_active,
          c.name as clientName
        FROM RIP.APP_DESTINOS d
        LEFT JOIN RIP.VW_APP_CLIENTES c ON d.customer_id = c.id
        ORDER BY c.name, d.name;
      `;
    }

    const destinationsData = await executeQuery(query, params);

    const destinations = destinationsData.map((d: any) => ({
      id: d.id,
      customer_id: d.customer_id,
      name: d.name,
      direccion: d.direccion,
      is_active: d.is_active,
      client: {
        name: d.clientName || null,
      },
    }));

    return NextResponse.json(destinations);
  } catch (error) {
    console.error("[API_DESTINATIONS_GET]", error);
    return new NextResponse("Error al obtener los destinos", { status: 500 });
  }
}

// POST para crear un nuevo destino
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // ✨ 2. Validar el body con Zod ANTES de ejecutar la lógica existente.
    const validation = destinationSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 3. Usar los datos validados (`validation.data`) en tu lógica original.
    const { name, direccion, customer_id } = validation.data;

    const query = `
      INSERT INTO RIP.APP_DESTINOS (customer_id, name, address)
      OUTPUT INSERTED.id, INSERTED.customer_id, INSERTED.name, INSERTED.address AS direccion, INSERTED.is_active
      VALUES (@customer_id, @name, @address);
    `;

    const params = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "address", type: TYPES.NVarChar, value: direccion || null },
    ];

    const result = await executeQuery(query, params);
    const newDestinationData = result[0];

    // Se añade el nombre del cliente a la respuesta para actualizar el estado del frontend consistentemente.
    const clientQuery = `SELECT name as name FROM RIP.VW_APP_CLIENTES WHERE id = @customer_id`;
    const clientResult = await executeQuery(clientQuery, [
      { name: "customer_id", type: TYPES.Int, value: newDestinationData.customer_id },
    ]);

    const newDestinationResponse = {
      ...newDestinationData,
      client: {
        name: clientResult[0]?.name || null,
      },
    };

    revalidateTag("destinations");
    revalidateTag("customers"); 

    return NextResponse.json(newDestinationResponse, { status: 201 });
  } catch (error) {
    console.error("[API_DESTINATIONS_POST]", error);
    return new NextResponse("Error al crear el destino", { status: 500 });
  }
}
