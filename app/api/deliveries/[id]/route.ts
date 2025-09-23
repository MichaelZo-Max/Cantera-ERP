// app/api/deliveries/[id]/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery } from "@/lib/types";
import util from "util";
import { confirmExitSchema, confirmLoadSchema } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

// --- Helpers ---
function mapDbStatusToUi(status: string): "PENDING" | "CARGADA" | "EXITED" {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
}

const getDeliveryByIdQuery = `
    SELECT
        d.id,
        d.status AS estado,
        d.notes,
        d.load_photo_url AS loadPhoto,
        d.exit_photo_url AS exitPhoto,
        p.id AS order_id,
        p.order_number,
        p.customer_id,
        p.status AS order_status,
        p.created_at AS order_created_at,
        c.id AS client_id,
        c.name AS client_name,
        t.id AS truck_id,
        t.placa,
        dr.id AS driver_id,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        (
            SELECT 
                pf.invoice_series,
                pf.invoice_number,
                pf.invoice_n,
                ISNULL(pf.invoice_series + '-' + CAST(pf.invoice_number AS VARCHAR) + pf.invoice_n COLLATE DATABASE_DEFAULT, '') AS invoice_full_number
            FROM RIP.APP_PEDIDOS_FACTURAS pf
            WHERE pf.pedido_id = p.id
            FOR JSON PATH
        ) AS order_invoices_json
    FROM RIP.APP_DESPACHOS d
    JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
    JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
    JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
    JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
    WHERE d.id = @id;
`;

// --- GET ---
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const despachoId = parseInt(params.id, 10);
    if (isNaN(despachoId)) {
      return NextResponse.json(
        { error: "ID de despacho inválido" },
        { status: 400 }
      );
    }

    const rows = await executeQuery(getDeliveryByIdQuery, [
      { name: "id", type: TYPES.Int, value: despachoId },
    ]);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró el despacho." },
        { status: 404 }
      );
    }

    const row = rows[0];
    const invoices = row.order_invoices_json ? JSON.parse(row.order_invoices_json) : [];

    const itemsQuery = `
        SELECT
            oi.id, oi.product_id, oi.quantity, oi.unit, oi.price_per_unit,
            prod.name AS product_name
        FROM RIP.APP_PEDIDOS_ITEMS oi
        JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
        WHERE oi.order_id = @order_id
        ORDER BY oi.id ASC;
    `;
    const itemRows = await executeQuery(itemsQuery, [{ name: "order_id", type: TYPES.Int, value: row.order_id }]);
    
    const orderItems = itemRows.map((item: any) => ({
      id: item.id,
      order_id: row.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      price_per_unit: item.price_per_unit,
      product: { id: item.product_id, name: item.product_name, unit: item.unit },
      dispatchItems: [],
    }));
    
    const finalPayload: Delivery = {
      id: row.id,
      estado: mapDbStatusToUi(row.estado),
      notes: row.notes ?? undefined,
      loadPhoto: row.loadPhoto ?? undefined,
      exitPhoto: row.exitPhoto ?? undefined,
      orderDetails: {
        id: row.order_id,
        order_number: row.order_number,
        customer_id: row.customer_id,
        status: row.order_status,
        created_at: row.order_created_at,
        client: { id: row.client_id, name: row.client_name },
        items: orderItems,
        invoices: invoices,
      },
      truck: { id: row.truck_id, placa: row.placa },
      driver: {
        id: row.driver_id,
        name: row.driver_name,
        phone: row.driver_phone ?? undefined,
      },
      dispatchItems: [] // Populate if needed
    };

    return NextResponse.json(finalPayload);
  } catch (e) {
    console.error("[API_DELIVERIES_ID_GET_ERROR]", util.inspect(e, { depth: null }));
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
    return NextResponse.json(
      { error: "Error al obtener el despacho", details: errorMessage },
      { status: 500 }
    );
  }
}

// --- PATCH ---
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const despachoId = parseInt(params.id, 10);
    if (isNaN(despachoId)) {
        return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 });
    }

    const formData = await request.formData();
    const status = formData.get("status") as string;
    const notes = (formData.get("notes") as string | null) ?? null;
    const userId = formData.get("userId") as string;
    const photoFile = formData.get("photoFile") as File | null;
    const itemsJson = formData.get("itemsJson") as string | null;

    if (!status || !userId) {
        return NextResponse.json({ error: "Faltan parámetros 'status' o 'userId'." }, { status: 400 });
    }

    if (status === "CARGADA") {
        const parsedItems = itemsJson ? JSON.parse(itemsJson) : [];
        const validation = confirmLoadSchema.safeParse({
            notes: notes ?? undefined,
            loadPhoto: photoFile,
            loadedItems: parsedItems,
        });

        if (!validation.success) {
            return NextResponse.json({ error: "Datos de confirmación de carga inválidos.", details: validation.error.flatten() }, { status: 400 });
        }

        const { loadedItems } = validation.data;
        let photoUrl: string | null = null;
        if (photoFile) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, "_")}`;
            const uploadDir = path.join(process.cwd(), "public/uploads");
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), buffer);
            photoUrl = `/uploads/${filename}`;
        }

        const updateDespachoSql = `
            UPDATE RIP.APP_DESPACHOS
            SET 
                status = 'CARGADA',
                loaded_by = @userId,
                loaded_at = GETDATE(),
                notes = ISNULL(@notes, notes),
                load_photo_url = ISNULL(@photoUrl, load_photo_url),
                updated_at = GETDATE()
            WHERE id = @despachoId;
        `;
        await executeQuery(updateDespachoSql, [
            { name: "despachoId", type: TYPES.Int, value: despachoId },
            { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
            { name: "notes", type: TYPES.NVarChar, value: notes },
            { name: "photoUrl", type: TYPES.NVarChar, value: photoUrl },
        ]);

        const deleteItemsSql = "DELETE FROM RIP.APP_DESPACHOS_ITEMS WHERE despacho_id = @despachoId;";
        await executeQuery(deleteItemsSql, [{ name: "despachoId", type: TYPES.Int, value: despachoId }]);

        for (const item of loadedItems) {
            if (item.dispatched_quantity > 0) {
                const insertItemSql = `
                    INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
                    VALUES (@despachoId, @pedidoItemId, @quantity);
                `;
                await executeQuery(insertItemSql, [
                    { name: "despachoId", type: TYPES.Int, value: despachoId },
                    { name: "pedidoItemId", type: TYPES.Int, value: parseInt(item.pedido_item_id, 10) },
                    { name: "quantity", type: TYPES.Decimal, value: item.dispatched_quantity },
                ]);
            }
        }
    } else if (status === "EXITED") {
        const validation = confirmExitSchema.safeParse({
            notes: notes ?? undefined,
            exitPhoto: photoFile,
        });

        if (!validation.success) {
            return NextResponse.json({ error: "Datos de confirmación de salida inválidos.", details: validation.error.flatten() }, { status: 400 });
        }
        
        const { exitPhoto } = validation.data;
        let photoUrl: string | null = null;
        if (exitPhoto) {
            const buffer = Buffer.from(await exitPhoto.arrayBuffer());
            const filename = `${Date.now()}_exit_${exitPhoto.name.replace(/\s/g, "_")}`;
            const uploadDir = path.join(process.cwd(), "public/uploads");
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), buffer);
            photoUrl = `/uploads/${filename}`;
        }
        
        const updateDespachoSql = `
            UPDATE RIP.APP_DESPACHOS
            SET
                status = 'EXITED',
                exited_by = @userId,
                exited_at = GETDATE(),
                notes = ISNULL(@notes, notes),
                exit_photo_url = ISNULL(@photoUrl, exit_photo_url),
                updated_at = GETDATE()
            WHERE id = @despachoId;
        `;
        await executeQuery(updateDespachoSql, [
            { name: "despachoId", type: TYPES.Int, value: despachoId },
            { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
            { name: "notes", type: TYPES.NVarChar, value: notes },
            { name: "photoUrl", type: TYPES.NVarChar, value: photoUrl },
        ]);
    } else {
        return NextResponse.json({ error: `Estado '${status}' no manejado.` }, { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");

    // Fetch the fully updated object to return to the client
    const updatedRows = await executeQuery(getDeliveryByIdQuery, [
        { name: "id", type: TYPES.Int, value: despachoId },
    ]);
    
    if (updatedRows.length === 0) {
        return NextResponse.json({ error: "No se encontró el despacho después de la actualización." }, { status: 404 });
    }
    
    const finalPayload = await GET(request, { params });
    return finalPayload;

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Error de validación.", details: e.flatten() }, { status: 400 });
    }
    console.error("[API_DELIVERIES_PATCH_ERROR]", util.inspect(e, { depth: null }));
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
    return NextResponse.json({ error: "Error al actualizar el despacho", details: errorMessage }, { status: 500 });
  }
}