// app/api/customers/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { customerSchema } from "@/lib/validations"; // ✨ 1. Importar el esquema
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------- GET: lista de clientes que tu UI muestra ----------
export async function GET() {
  try {
    // Se consulta la vista que ya formatea los datos como los necesita el front.
    const sql = `
      SELECT
        id,
        name,
        rfc,
        address,
        phone,
        email,
        is_active
      FROM RIP.VW_APP_CLIENTES
      ORDER BY name ASC;
    `;
    const rows = await executeQuery<any>(sql);

    // Mapeo directo desde los resultados de la vista.
    const out = rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? "",
      rif: r.rfc ?? null,
      address: r.address ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      is_active: r.is_active,
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error("[API_CUSTOMERS_GET]", e);
    return new NextResponse("Error al obtener clientes", { status: 500 });
  }
}

// ---------- POST: crea un nuevo cliente con validación de backend ----------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // ✨ 2. Validar el body con Zod. Esta es la capa de seguridad principal.
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      // Si la validación falla, se retorna un error 400 con los detalles.
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 3. Usar los datos ya validados y limpios por Zod.
    const { name, rif, address, phone, email } = validation.data;

    // Obtener el siguiente código de cliente disponible.
    const nextCodeRows = await executeQuery<{ nextCode: number }>(`
      SELECT ISNULL(MAX(CODCLIENTE), 0) + 1 AS nextCode
      FROM dbo.CLIENTES;
    `);
    const codCliente = nextCodeRows[0]?.nextCode ?? 1;

    // Insertar el nuevo cliente y luego seleccionarlo desde la vista para devolver el objeto completo.
    const sql = `
      INSERT INTO dbo.CLIENTES (
        CODCLIENTE, NOMBRECLIENTE, NIF20, DIRECCION1, TELEFONO1, E_MAIL, DESCATALOGADO
      ) VALUES (
        @codCliente, @nombreCliente, @nif20, @direccion1, @telefono1, @e_mail, 'F'
      );

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

    // Mapear la respuesta para asegurar consistencia con GET.
    const savedCustomer = {
      id: r.id,
      name: r.name ?? "",
      rif: r.rfc ?? null,
      address: r.address ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      is_active: r.is_active,
    };

    // Invalidar el caché para que la lista de clientes se actualice en el front.
    revalidateTag("customers");

    return NextResponse.json(savedCustomer, { status: 201 });
  } catch (e: any) {
    // Manejar errores específicos de la base de datos, como claves únicas duplicadas.
    if (e?.number === 2627 || e?.number === 2601) {
      return new NextResponse(
        "Un cliente con el mismo RIF o Email ya existe.",
        { status: 409 } // 409 Conflict es más apropiado para duplicados.
      );
    }
    console.error("[API_CUSTOMERS_POST]", e);
    return new NextResponse("Error interno al crear el cliente.", {
      status: 500,
    });
  }
}
