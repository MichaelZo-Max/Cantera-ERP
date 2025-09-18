import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { truckSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * @route GET /api/trucks
 * @desc Obtener todos los camiones
 */
export async function GET() {
  try {
    // ✨ Hecho más robusto para devolver todos los camiones, no solo activos
    // El frontend puede filtrar si es necesario.
    const query = `
      SELECT 
        id, placa, brand, model, capacity, is_active
      FROM RIP.APP_CAMIONES
      ORDER BY placa;
    `;
    const trucks = await executeQuery(query);
    return NextResponse.json(trucks);
  } catch (error) {
    console.error("[API_TRUCKS_GET]", error);
    return new NextResponse("Error al obtener camiones", { status: 500 });
  }
}

/**
 * @route   POST /api/trucks
 * @desc    Crear un nuevo camión
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Validar el body con el esquema de Zod
    const validation = truckSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 2. Usar los nombres de campo CORRECTOS: `placa` y `capacity`
    const { placa, brand, model, capacity } = validation.data;

    // ✨ 3. Actualizar la consulta SQL para usar las columnas correctas
    const query = `
      INSERT INTO RIP.APP_CAMIONES (placa, brand, model, capacity, is_active)
      OUTPUT INSERTED.*
      VALUES (@placa, @brand, @model, @capacity, 1);
    `;

    // ✨ 4. Pasar los parámetros correctos a la consulta
    const result = await executeQuery(query, [
      { name: "placa", type: TYPES.NVarChar, value: placa },
      { name: "brand", type: TYPES.NVarChar, value: brand ?? null },
      { name: "model", type: TYPES.NVarChar, value: model ?? null },
      // `capacity` es de tipo Decimal o Float en la BD
      { name: "capacity", type: TYPES.Decimal, value: capacity ?? null },
    ]);

    revalidateTag("trucks");

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("[API_TRUCKS_POST]", error);
    if (error.message && error.message.includes("Violation of UNIQUE KEY constraint")) {
      return new NextResponse(
        // Mensaje de error específico para el campo 'placa'
        JSON.stringify({ placa: ["La placa ingresada ya existe."] }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    return new NextResponse("Error al crear el camión.", { status: 500 });
  }
}