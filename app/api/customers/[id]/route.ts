// app/api/customers/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache"; // Importamos revalidateTag

export const dynamic = "force-dynamic";

// Utilidad para traer un cliente y mapearlo como lo espera el front
async function fetchCustomerById(id: number) {
  const rows = await executeQuery<any>(
    `
    SELECT
      CODCLIENTE,
      NOMBRECLIENTE,
      NIF20,
      DIRECCION1,
      TELEFONO1,
      E_MAIL,
      DESCATALOGADO
    FROM dbo.CLIENTES
    WHERE CODCLIENTE = @id;
  `,
    [{ name: "id", type: TYPES.Int, value: id }]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.CODCLIENTE,
    name: r.NOMBRECLIENTE ?? "",
    rif: r.NIF20 ?? null,
    address: r.DIRECCION1 ?? null,
    phone: r.TELEFONO1 ?? null,
    email: r.E_MAIL ?? null,
    is_active: (r.DESCATALOGADO ?? "F").toString().toUpperCase() !== "T",
  };
}

// ---------- PATCH: actualizar datos y/o cambiar estado (toggle) ----------
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return new NextResponse("ID inválido", { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // La página manda el mismo objeto Client + is_active cuando hace toggle:
    // { ...customer, is_active: !is_active }
    const name =
      body?.name !== undefined ? String(body.name).trim() : undefined;
    const rif = body?.rif !== undefined ? String(body.rif).trim() : undefined;
    const address =
      body?.address !== undefined ? String(body.address).trim() : undefined;
    const phone =
      body?.phone !== undefined ? String(body.phone).trim() : undefined;
    const email =
      body?.email !== undefined ? String(body.email).trim() : undefined;

    // is_active (boolean) → DESCATALOGADO 'F'/'T'
    let descatalogadoValue: "F" | "T" | undefined = undefined;
    if (typeof body?.is_active === "boolean") {
      descatalogadoValue = body.is_active ? "F" : "T";
    }

    // Construimos UPDATE dinámico solo con lo que venga definido
    const sets: string[] = [];
    const paramsArr: any[] = [{ name: "id", type: TYPES.Int, value: id }];

    if (name !== undefined) {
      sets.push("NOMBRECLIENTE = @nombreCliente");
      paramsArr.push({
        name: "nombreCliente",
        type: TYPES.NVarChar,
        value: name || null,
        options: { length: 200 },
      });
    }
    if (rif !== undefined) {
      sets.push("NIF20 = @nif20");
      paramsArr.push({
        name: "nif20",
        type: TYPES.NVarChar,
        value: rif || null,
        options: { length: 20 },
      });
    }
    if (address !== undefined) {
      sets.push("DIRECCION1 = @direccion1");
      paramsArr.push({
        name: "direccion1",
        type: TYPES.NVarChar,
        value: address || null,
        options: { length: 400 },
      });
    }
    if (phone !== undefined) {
      sets.push("TELEFONO1 = @telefono1");
      paramsArr.push({
        name: "telefono1",
        type: TYPES.NVarChar,
        value: phone || null,
        options: { length: 50 },
      });
    }
    if (email !== undefined) {
      sets.push("E_MAIL = @e_mail");
      paramsArr.push({
        name: "e_mail",
        type: TYPES.NVarChar,
        value: email || null,
        options: { length: 120 },
      });
    }
    if (descatalogadoValue !== undefined) {
      sets.push("DESCATALOGADO = @descatalogado");
      paramsArr.push({
        name: "descatalogado",
        type: TYPES.NVarChar,
        value: descatalogadoValue,
        options: { length: 1 },
      });
    }

    if (sets.length === 0) {
      // nada que actualizar → devolvemos el registro actual
      const current = await fetchCustomerById(id);
      if (!current)
        return new NextResponse("Cliente no encontrado", { status: 404 });
      return NextResponse.json(current);
    }

    const sql = `
      UPDATE dbo.CLIENTES
      SET ${sets.join(", ")}
      WHERE CODCLIENTE = @id;

      SELECT
        CODCLIENTE,
        NOMBRECLIENTE,
        NIF20,
        DIRECCION1,
        TELEFONO1,
        E_MAIL,
        DESCATALOGADO
      FROM dbo.CLIENTES
      WHERE CODCLIENTE = @id;
    `;

    const rows = await executeQuery<any>(sql, paramsArr);
    const r = rows[0];
    if (!r) return new NextResponse("Cliente no encontrado", { status: 404 });

    const updated = {
      id: r.CODCLIENTE,
      name: r.NOMBRECLIENTE ?? "",
      rif: r.NIF20 ?? null,
      address: r.DIRECCION1 ?? null,
      phone: r.TELEFONO1 ?? null,
      email: r.E_MAIL ?? null,
      is_active: (r.DESCATALOGADO ?? "F").toString().toUpperCase() !== "T",
    };

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag("customers");

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[API_CUSTOMERS_PATCH]", e);
    return new NextResponse("Error al actualizar cliente", { status: 500 });
  }
}
