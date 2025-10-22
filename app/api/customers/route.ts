// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { customerSchema } from "@/lib/validations";
import { z } from "zod";
import { errorHandler } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

// ---------- GET: lista de clientes paginada y con búsqueda ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const searchTerm = searchParams.get("q") || "";
    const isActive = searchParams.get("is_active");
    const customerId = searchParams.get("id"); // <-- NUEVO: Obtener el ID específico

    const offset = (page - 1) * limit;

    const params: any[] = [];
    let whereClauses: string[] = [];

    // Si se pide un ID específico, este filtro tiene prioridad.
    if (customerId) {
      whereClauses.push(`id = ${parseInt(customerId, 10)}`);
    }

    // Si se especifica el estado de activo/inactivo, lo añadimos al filtro.
    if (isActive === "true") {
      whereClauses.push(`is_active = 1`);
    }

    if (searchTerm) {
      // --- CAMBIO: Se añade COLLATE para que la búsqueda ignore acentos y mayúsculas/minúsculas ---
      const collation = "Latin1_General_CI_AI"; // CI: Case-Insensitive, AI: Accent-Insensitive
      whereClauses.push(
        `(name COLLATE ${collation} LIKE @searchTerm OR rfc COLLATE ${collation} LIKE @searchTerm)`
      );

      params.push({
        name: "searchTerm",
        type: TYPES.NVarChar,
        value: `%${searchTerm}%`,
      });
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- Consulta #1: Conteo total (sigue usando la vista) ---
    const countQuery = `SELECT COUNT(*) as total FROM RIP.VW_APP_CLIENTES ${whereClause}`;
    const countResult = await executeQuery<{ total: number }>(
      countQuery,
      params
    );
    const total = countResult[0]?.total ?? 0;

    // --- Consulta #2: Obtener la página de datos ---
    const dataQuery = `
      SELECT
        id,
        name,
        rfc,
        address,
        phone,
        email,
        is_active
      FROM RIP.VW_APP_CLIENTES
      ${whereClause} 
      -- ✨ CORRECCIÓN CLAVE: Ordenamos por 'id' que es más estable para la paginación.
      ORDER BY id DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY;
    `;

    const queryParams = [
      ...params,
      { name: "offset", type: TYPES.Int, value: offset },
      { name: "limit", type: TYPES.Int, value: limit },
    ];

    const customerRows = await executeQuery<any>(dataQuery, queryParams);

    // Mapeo de datos que ahora recibirá la información correcta de la vista.
    const mappedCustomers = customerRows.map((r: any) => ({
      id: r.id,
      name: r.name ?? "",
      rif: r.rfc ?? null,
      address: r.address ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      is_active: r.is_active === 1 || r.is_active === true, // Acepta 1 o true
    }));

    return NextResponse.json({
      data: mappedCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[API_CUSTOMERS_GET]", error);
    return errorHandler(error);
  }
}

// ---------- POST: Se ajusta para seguir usando la VISTA consistentemente ----------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { name, rif, address, phone, email } = validation.data;

    const nextCodeRows = await executeQuery<{ nextCode: number }>(`
      SELECT ISNULL(MAX(CODCLIENTE), 0) + 1 AS nextCode
      FROM dbo.CLIENTES;
    `);
    const codCliente = nextCodeRows[0]?.nextCode ?? 1;

    // Se inserta en la tabla real, como debe ser.
    const sql = `
      INSERT INTO dbo.CLIENTES (
        CODCLIENTE, NOMBRECLIENTE, NIF20, DIRECCION1, TELEFONO1, E_MAIL, DESCATALOGADO
      ) VALUES (
        @codCliente, @nombreCliente, @nif20, @direccion1, @telefono1, @e_mail, 'F'
      );

      -- Se selecciona el resultado desde la VISTA para mantener consistencia.
      SELECT * FROM RIP.VW_APP_CLIENTES WHERE id = @codCliente;
    `;

    const params = [
      { name: "codCliente", type: TYPES.Int, value: codCliente },
      {
        name: "nombreCliente",
        type: TYPES.NVarChar,
        value: name,
        options: { length: 200 },
      },
      {
        name: "nif20",
        type: TYPES.NVarChar,
        value: rif,
        options: { length: 20 },
      },
      {
        name: "direccion1",
        type: TYPES.NVarChar,
        value: address,
        options: { length: 400 },
      },
      {
        name: "telefono1",
        type: TYPES.NVarChar,
        value: phone,
        options: { length: 50 },
      },
      {
        name: "e_mail",
        type: TYPES.NVarChar,
        value: email,
        options: { length: 120 },
      },
    ];

    const rows = await executeQuery<any>(sql, params);
    const r = rows[0];

    const savedCustomer = {
      id: r.id,
      name: r.name ?? "",
      rif: r.rfc ?? null,
      address: r.address ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      is_active: r.is_active === 1 || r.is_active === true,
    };

    revalidateTag("customers");

    return NextResponse.json(savedCustomer, { status: 201 });
  } catch (e: any) {
    if (e?.number === 2627 || e?.number === 2601) {
      return new NextResponse(
        "Un cliente con el mismo RIF o Email ya existe.",
        { status: 409 }
      );
    }
    console.error("[API_CUSTOMERS_POST]", e);
    return new NextResponse("Error interno al crear el cliente.", {
      status: 500,
    });
  }
}
