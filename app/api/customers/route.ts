// app/api/customers/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

// ---------- GET: lista de clientes que tu UI muestra ----------
export async function GET() {
  try {
    const sql = `
      SELECT
        CODCLIENTE,
        NOMBRECLIENTE,
        NIF20,
        DIRECCION1,
        TELEFONO1,
        E_MAIL,
        DESCATALOGADO
      FROM dbo.CLIENTES
      ORDER BY NOMBRECLIENTE ASC;
    `;
    const rows = await executeQuery<any>(sql);

    const out = rows.map((r: any) => ({
      id: r.CODCLIENTE,
      nombre: r.NOMBRECLIENTE ?? "",
      rif: r.NIF20 ?? null,
      address: r.DIRECCION1 ?? null,
      phone: r.TELEFONO1 ?? null,
      email: r.E_MAIL ?? null,
      is_active: (r.DESCATALOGADO ?? "F").toString().toUpperCase() !== "T",
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error("[API_CUSTOMERS_GET]", e);
    return new NextResponse("Error al obtener clientes", { status: 500 });
  }
}

// ---------- POST: crea cliente desde los campos del formulario del front ----------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // La página envía exactamente estos nombres:
    const nombre = String(body?.nombre ?? "").trim();
    const rif = (body?.rif ?? "").toString().trim() || null;
    const address = (body?.address ?? "").toString().trim() || null;
    const phone = (body?.phone ?? "").toString().trim() || null;
    const email = (body?.email ?? "").toString().trim() || null;

    if (!nombre) {
      return new NextResponse("El campo nombre es obligatorio", {
        status: 400,
      });
    }

    // Generamos CODCLIENTE (MAX+1). Si prefieres exigirlo desde el front, quita este bloque.
    const nextCodeRows = await executeQuery<{ nextCode: number }>(`
      SELECT ISNULL(MAX(CODCLIENTE), 0) + 1 AS nextCode
      FROM dbo.CLIENTES;
    `);
    const codCliente = nextCodeRows[0]?.nextCode ?? 1;

    // Insert exacto con tus columnas (sin OUTPUT para no chocar con triggers)
    const sql = `
      INSERT INTO dbo.CLIENTES (
        CODCLIENTE,
        NOMBRECLIENTE,
        NIF20,
        DIRECCION1,
        TELEFONO1,
        E_MAIL,
        DESCATALOGADO
      )
      VALUES (
        @codCliente,
        @nombreCliente,
        @nif20,
        @direccion1,
        @telefono1,
        @e_mail,
        'F'
      );

      -- Devolvemos el registro tal como lo espera el front
      SELECT
        CODCLIENTE,
        NOMBRECLIENTE,
        NIF20,
        DIRECCION1,
        TELEFONO1,
        E_MAIL,
        DESCATALOGADO
      FROM dbo.CLIENTES
      WHERE CODCLIENTE = @codCliente;
    `;

    const params = [
      { name: "codCliente", type: TYPES.Int, value: codCliente },
      {
        name: "nombreCliente",
        type: TYPES.NVarChar,
        value: nombre,
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

    const saved = {
      id: r.CODCLIENTE,
      nombre: r.NOMBRECLIENTE ?? "",
      rif: r.NIF20 ?? null,
      address: r.DIRECCION1 ?? null,
      phone: r.TELEFONO1 ?? null,
      email: r.E_MAIL ?? null,
      is_active: (r.DESCATALOGADO ?? "F").toString().toUpperCase() !== "T",
    };
    
    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('customers');

    // Tu página espera el objeto completo:
    return NextResponse.json(saved, { status: 201 });
  } catch (e: any) {
    if (e?.number === 2627 || e?.number === 2601) {
      return new NextResponse(
        "Cliente duplicado (CODCLIENTE / NIF20 / E_MAIL ya existe)",
        { status: 409 }
      );
    }
    console.error("[API_CUSTOMERS_POST]", e);
    return new NextResponse("Error al crear cliente", { status: 500 });
  }
}
