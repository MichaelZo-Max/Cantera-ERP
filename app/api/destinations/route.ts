// app/api/destinations/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db"; 
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { destinationSchema } from "@/lib/validations"; 

export const dynamic = "force-dynamic";

// GET: OBTENER TODOS LOS DESTINOS
export async function GET() {
  try {
    const query = `
      SELECT 
        d.id,
        d.name,
        d.direccion,
        d.is_active,
        d.customer_id,
        c.NOMBRECLIENTE as client_name
      FROM RIP.APP_DESTINOS d
      LEFT JOIN dbo.CLIENTES c ON c.CODCLIENTE = d.customer_id
      ORDER BY d.id DESC;
    `;
    const destinations = await executeQuery(query, []);
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
    // Se utiliza 'destinationSchema' para la validación.
    const validation = destinationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }

    const { name, direccion, customer_id } = validation.data;

    const query = `
      INSERT INTO RIP.APP_DESTINOS (name, direccion, customer_id)
      VALUES (@name, @direccion, @customer_id);
    `;
    
    await executeQuery(query, [
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "direccion", type: TYPES.NVarChar, value: direccion },
      { name: "customer_id", type: TYPES.NVarChar, value: customer_id },
    ]);

    revalidateTag("destinations");

    return NextResponse.json({ message: "Destino creado correctamente" }, { status: 201 });
  } catch (error) {
    console.error("[API_DESTINATIONS_POST]", error);
    if (error instanceof z.ZodError) {
        return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse("Error al crear el destino", { status: 500 });
  }
}