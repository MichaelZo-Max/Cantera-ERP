// app/api/destinations/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { destinationSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// Para mayor claridad, definimos el tipo de dato que viene de la base de datos
type DestinationFromDB = {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  customer_id: number;
  client_name: string | null;
};

// GET: OBTENER TODOS LOS DESTINOS
export async function GET() {
  try {
    const query = `
      SELECT
        d.id,
        d.name,
        d.address,
        d.is_active,
        d.customer_id,
        c.NOMBRECLIENTE as client_name
      FROM RIP.APP_DESTINOS d
      LEFT JOIN dbo.CLIENTES c ON c.CODCLIENTE = d.customer_id
      ORDER BY d.id DESC;
    `;
    const results = (await executeQuery(query, [])) as DestinationFromDB[];

    // ✨ CORRECCIÓN: Transformamos el resultado para anidar los datos del cliente
    const destinations = results.map((dest) => ({
      id: dest.id,
      name: dest.name,
      address: dest.address,
      is_active: dest.is_active,
      customer_id: dest.customer_id,
      client: { // Creamos el objeto anidado que el frontend espera
        name: dest.client_name,
      },
    }));

    return NextResponse.json(destinations);
  } catch (error) {
    console.error("[API_DESTINATIONS_GET]", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

// POST: CREAR UN NUEVO DESTINO
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = destinationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }

    const { name, address, customer_id } = validation.data;

    const query = `
      INSERT INTO RIP.APP_DESTINOS (name, address, customer_id)
      VALUES (@name, @address, @customer_id);
    `;

    await executeQuery(query, [
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "address", type: TYPES.NVarChar, value: address },
      { name: "customer_id", type: TYPES.Int, value: customer_id },
    ]);

    revalidateTag("destinations");

    const createdDestinationQuery = `
      SELECT TOP 1
        d.id, d.name, d.address, d.is_active, d.customer_id,
        c.NOMBRECLIENTE as client_name
      FROM RIP.APP_DESTINOS d
      LEFT JOIN dbo.CLIENTES c ON c.CODCLIENTE = d.customer_id
      ORDER BY d.id DESC;
    `;
    const newDestinationResult = (await executeQuery(
      createdDestinationQuery,
      []
    )) as DestinationFromDB[];
    const newDest = newDestinationResult[0];

    // ✨ CORRECCIÓN: Hacemos la misma transformación al crear un nuevo destino
    const createdDestination = {
      id: newDest.id,
      name: newDest.name,
      address: newDest.address,
      is_active: newDest.is_active,
      customer_id: newDest.customer_id,
      client: {
        name: newDest.client_name,
      },
    };

    return NextResponse.json(createdDestination, { status: 201 });
  } catch (error) {
    console.error("[API_DESTINATIONS_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse("Error al crear el destino", { status: 500 });
  }
}