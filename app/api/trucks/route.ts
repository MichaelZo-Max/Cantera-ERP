// app/api/trucks/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache"; // Importamos revalidateTag

export const dynamic = "force-dynamic";

/**
 * @route GET /api/trucks
 * @desc Obtener todos los camiones activos
 */
export async function GET() {
  try {
    // ⬇️ SE ELIMINÓ LA UNIÓN (JOIN) CON LA TABLA DE CHOFERES
    const query = `
      SELECT 
        id, placa, brand, model, capacity, is_active
      FROM RIP.APP_CAMIONES
      WHERE is_active = 1 
      ORDER BY placa;
    `;
    const trucks = await executeQuery(query);

    // Se devuelve directamente el resultado de la consulta sin mapeo adicional
    return NextResponse.json(trucks);
  } catch (error) {
    console.error("[API_TRUCKS_GET]", error);
    return new NextResponse("Error al obtener camiones", { status: 500 });
  }
}

/**
 * @route POST /api/trucks
 * @desc Crear un nuevo camión
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ⬇️ SE ELIMINÓ driver_id DEL BODY
    const { placa, brand, model, capacity } = body;

    if (!placa || !capacity) {
      return new NextResponse("La placa y la capacidad son requeridas", {
        status: 400,
      });
    }

    // ⬇️ SE ELIMINÓ driver_id DE LA CONSULTA INSERT
    const query = `
      INSERT INTO RIP.APP_CAMIONES (placa, brand, model, capacity)
      OUTPUT INSERTED.id, INSERTED.placa, INSERTED.brand, INSERTED.model, INSERTED.capacity, INSERTED.is_active
      VALUES (@placa, @brand, @model, @capacity);
    `;

    // ⬇️ SE ELIMINÓ EL PARÁMETRO driver_id
    const params = [
      { name: "placa", type: TYPES.NVarChar, value: placa },
      { name: "brand", type: TYPES.NVarChar, value: brand },
      { name: "model", type: TYPES.NVarChar, value: model },
      { name: "capacity", type: TYPES.Decimal, value: capacity },
    ];

    const result = await executeQuery(query, params);

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag("trucks");

    // ⬇️ SE ELIMINÓ LA LÓGICA PARA BUSCAR EL CHOFER Y SE DEVUELVE SOLO EL CAMIÓN CREADO
    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601) {
      const duplicateValue = error.message.match(/\(([^)]+)\)/)?.[1];
      return new NextResponse(`La placa '${duplicateValue}' ya existe.`, {
        status: 409,
      });
    }
    console.error("[API_TRUCKS_POST]", error);
    return new NextResponse("Error al crear el camión", { status: 500 });
  }
}
