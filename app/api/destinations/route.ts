// app/api/destinations/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import type { Destination } from "@/lib/types";

/**
 * @route GET /api/destinations
 * @desc Obtener destinos. Si se provee `clientId`, filtra por cliente; sino, devuelve todos CON el nombre del cliente.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    let query: string;
    const params: any[] = [];

    if (clientId) {
      // Flujo para el cajero: no necesita el nombre del cliente, se mantiene simple.
      query = `
        SELECT id, customer_id as clientId, name AS nombre, address AS direccion, is_active
        FROM RIP.APP_DESTINOS
        WHERE customer_id = @clientId AND is_active = 1
        ORDER BY name;
      `;
      params.push({ name: "clientId", type: TYPES.Int, value: parseInt(clientId, 10) });
    } else {
      // ✨ CAMBIO CLAVE: Flujo para el admin.
      // Se une RIP.APP_DESTINOS con la vista de clientes para obtener el nombre.
      query = `
        SELECT
          d.id,
          d.customer_id as clientId,
          d.name AS nombre,
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
      id: d.id.toString(),
      clientId: d.clientId.toString(),
      nombre: d.nombre,
      direccion: d.direccion,
      is_active: d.is_active,
      // ✨ NUEVO: Se adjunta un objeto 'client' con el nombre para fácil acceso en el frontend.
      client: {
        nombre: d.clientName || null
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return NextResponse.json(destinations);
  } catch (error) {
    console.error("[API_DESTINATIONS_GET]", error);
    return new NextResponse("Error al obtener los destinos", { status: 500 });
  }
}

// El método POST se mantiene igual, ya que funciona correctamente.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer_id = body.clientId || body.customer_id;
    const { nombre, direccion } = body;

    if (!customer_id || !nombre) {
      return new NextResponse( "El ID del cliente y el nombre del destino son requeridos", { status: 400 });
    }

    const query = `
      INSERT INTO RIP.APP_DESTINOS (customer_id, name, address)
      OUTPUT INSERTED.id, INSERTED.customer_id as clientId, INSERTED.name as nombre, INSERTED.address as direccion, INSERTED.is_active
      VALUES (@customer_id, @name, @address);
    `;

    const params = [
      { name: "customer_id", type: TYPES.Int, value: customer_id },
      { name: "name", type: TYPES.NVarChar, value: nombre },
      { name: "address", type: TYPES.NVarChar, value: direccion || null },
    ];

    const result = await executeQuery(query, params);
    
    // Se añade el nombre del cliente a la respuesta para actualizar el estado del frontend consistentemente.
    const clientQuery = `SELECT name as nombre FROM RIP.VW_APP_CLIENTES WHERE id = @customer_id`;
    const clientResult = await executeQuery(clientQuery, [{ name: "customer_id", type: TYPES.Int, value: customer_id }]);

    const newDestination = {
        ...result[0],
        id: result[0].id.toString(),
        clientId: result[0].clientId.toString(),
        client: {
            nombre: clientResult[0]?.nombre || null
        }
    }

    return NextResponse.json(newDestination, { status: 201 });
  } catch (error) {
    console.error("[API_DESTINATIONS_POST]", error);
    return new NextResponse("Error al crear el destino", { status: 500 });
  }
}