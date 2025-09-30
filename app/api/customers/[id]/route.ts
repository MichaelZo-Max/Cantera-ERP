// app/api/customers/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { customerSchema } from "@/lib/validations"; // ✨ 1. Importar el esquema
import { z } from "zod";

export const dynamic = "force-dynamic";

async function fetchCustomerById(id: number) {
  const rows = await executeQuery<any>(
    `SELECT * FROM RIP.VW_APP_CLIENTES WHERE id = @id;`,
    [{ name: "id", type: TYPES.Int, value: id }]
  );
  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    name: r.name ?? "",
    rif: r.rfc ?? null,
    address: r.address ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    is_active: r.is_active === 1,
  };
}

// ---------- PATCH: actualizar datos y/o cambiar status (toggle) con validación ----------
export async function PATCH(
  req: Request,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const id = parseInt(routeParams.id, 10);
    if (Number.isNaN(id)) {
      return new NextResponse("ID de cliente inválido.", { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // ✨ 2. Esquema para PATCH: .partial() hace todos los campos del formulario opcionales.
    //    Se extiende para aceptar `is_active` que se usa para activar/desactivar.
    const patchSchema = customerSchema.partial().extend({
      is_active: z.boolean().optional(),
    });

    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✨ 3. Usar los datos ya validados y limpios por Zod.
    const { name, rif, address, phone, email, is_active } = validation.data;

    // Convertir el booleano `is_active` al valor 'F'/'T' que espera la DB.
    let descatalogadoValue: "F" | "T" | undefined = undefined;
    if (typeof is_active === "boolean") {
      descatalogadoValue = is_active ? "F" : "T";
    }

    // Construir la consulta UPDATE dinámicamente solo con los campos recibidos.
    const sets: string[] = [];
    const paramsArr: any[] = [{ name: "id", type: TYPES.Int, value: id }];

    if (name !== undefined) {
      sets.push("NOMBRECLIENTE = @nombreCliente");
      paramsArr.push({
        name: "nombreCliente",
        type: TYPES.NVarChar,
        value: name,
        options: { length: 200 },
      });
    }
    if (rif !== undefined) {
      sets.push("NIF20 = @nif20");
      paramsArr.push({
        name: "nif20",
        type: TYPES.NVarChar,
        value: rif,
        options: { length: 20 },
      });
    }
    if (address !== undefined) {
      sets.push("DIRECCION1 = @direccion1");
      paramsArr.push({
        name: "direccion1",
        type: TYPES.NVarChar,
        value: address,
        options: { length: 400 },
      });
    }
    if (phone !== undefined) {
      sets.push("TELEFONO1 = @telefono1");
      paramsArr.push({
        name: "telefono1",
        type: TYPES.NVarChar,
        value: phone,
        options: { length: 50 },
      });
    }
    if (email !== undefined) {
      sets.push("E_MAIL = @e_mail");
      paramsArr.push({
        name: "e_mail",
        type: TYPES.NVarChar,
        value: email,
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

    // Si no se envió ningún dato para actualizar, simplemente devolvemos el cliente actual.
    if (sets.length === 0) {
      const currentCustomer = await fetchCustomerById(id);
      if (!currentCustomer) {
        return new NextResponse("Cliente no encontrado.", { status: 404 });
      }
      return NextResponse.json(currentCustomer);
    }

    const sql = `
      UPDATE dbo.CLIENTES
      SET ${sets.join(", ")}
      WHERE CODCLIENTE = @id;
    `;

    await executeQuery<any>(sql, paramsArr);

    // ✨ 4. Obtener y devolver el cliente actualizado desde la vista para asegurar consistencia.
    const updatedCustomer = await fetchCustomerById(id);
    if (!updatedCustomer) {
      return new NextResponse("Cliente no encontrado después de actualizar.", {
        status: 404,
      });
    }

    revalidateTag("customers");

    return NextResponse.json(updatedCustomer);
  } catch (e: any) {
    if (e?.number === 2627 || e?.number === 2601) {
      return new NextResponse(
        "Un cliente con el mismo RIF o Email ya existe.",
        { status: 409 }
      );
    }
    console.error("[API_CUSTOMERS_PATCH]", e);
    return new NextResponse("Error interno al actualizar el cliente.", {
      status: 500,
    });
  }
}
