// app/api/customers/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic'

// ---------- GET: lista de clientes que tu UI muestra ----------
export async function GET() {
  try {
    // CAMBIO: Se consulta la vista RIP.VW_APP_CLIENTES en lugar de la tabla directamente.
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

    // El mapeo ahora es más directo porque la vista ya tiene los nombres correctos.
    const out = rows.map((r: any) => ({
      id: r.id,
      nombre: r.name ?? "",
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

// ---------- POST: crea cliente desde los campos del formulario del front ----------
// Esta función ya estaba correcta, se mantiene igual.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

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

    const nextCodeRows = await executeQuery<{ nextCode: number }>(`
      SELECT ISNULL(MAX(CODCLIENTE), 0) + 1 AS nextCode
      FROM dbo.CLIENTES;
    `);
    const codCliente = nextCodeRows[0]?.nextCode ?? 1;

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
    
    revalidateTag('customers');

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
