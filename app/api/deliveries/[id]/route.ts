// app/api/deliveries/[id]/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery, OrderItem } from "@/lib/types";
import util from "util";
import { confirmExitSchema } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

// --- Helpers ---

/**
 * Garantiza que la URL de la imagen tenga el formato correcto para el cliente.
 * @param filename El nombre del archivo de la base de datos.
 * @returns Una ruta completa como /uploads/filename.jpg o undefined.
 */
const getFullImageUrl = (filename: string | null | undefined): string | undefined => {
  if (!filename) return undefined;
  return `/uploads/${filename}`;
};

function mapDbStatusToUi(status: string): "PENDING" | "CARGADA" | "EXITED" {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
}

// Se añade exit_notes a la consulta
const getDeliveryByIdQuery = `
    SELECT
        d.id, d.status AS estado, d.notes, d.exit_notes,
        d.load_photo_url AS loadPhoto, 
        d.exit_photo_url AS exitPhoto,
        d.exit_load_photo_url AS exitLoadPhoto,
        d.exited_at,
        p.id AS order_id, p.order_number, p.customer_id, p.status AS order_status, p.created_at AS order_created_at,
        c.id AS client_id, c.name AS client_name,
        t.id AS truck_id, t.placa,
        dr.id AS driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
        (
            SELECT 
                pf.invoice_series, pf.invoice_number, pf.invoice_n,
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
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 });
    }

    const rows = await executeQuery(getDeliveryByIdQuery, [{ name: "id", type: TYPES.Int, value: despachoId }]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No se encontró el despacho." }, { status: 404 });
    }

    const row = rows[0];
    const orderId = row.order_id;
    const invoices = row.order_invoices_json ? JSON.parse(row.order_invoices_json) : [];

    const dispatchedQuantitiesQuery = `
      SELECT
        di.pedido_item_id,
        SUM(di.dispatched_quantity) as total_dispatched
      FROM RIP.APP_DESPACHOS_ITEMS di
      JOIN RIP.APP_DESPACHOS d ON d.id = di.despacho_id
      WHERE d.order_id = @order_id AND d.id != @current_despacho_id AND d.status IN ('CARGADA', 'SALIDA', 'EXITED')
      GROUP BY di.pedido_item_id;
    `;
    const dispatchedRows = await executeQuery(dispatchedQuantitiesQuery, [
      { name: "order_id", type: TYPES.Int, value: orderId },
      { name: "current_despacho_id", type: TYPES.Int, value: despachoId },
    ]);

    const dispatchedMap = new Map<number, number>();
    for (const dispatchedItem of dispatchedRows) {
      dispatchedMap.set(
        dispatchedItem.pedido_item_id,
        dispatchedItem.total_dispatched
      );
    }

    const itemsQuery = `
        SELECT
            oi.id, oi.product_id, oi.quantity, oi.unit, oi.price_per_unit,
            prod.name AS product_name
        FROM RIP.APP_PEDIDOS_ITEMS oi
        JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
        WHERE oi.order_id = @order_id
        ORDER BY oi.id ASC;
    `;
    const itemRows = await executeQuery(itemsQuery, [
      { name: "order_id", type: TYPES.Int, value: orderId },
    ]);

    const orderItems: OrderItem[] = itemRows.map((item: any) => ({
      id: item.id,
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      price_per_unit: item.price_per_unit,
      product: {
        id: item.product_id,
        name: item.product_name,
        unit: item.unit,
      },
      totalDispatched: dispatchedMap.get(item.id) || 0,
      dispatchItems: [],
    }));

    // Se formatean las URLs y se añaden todas las notas y la fecha.
    const finalPayload: Delivery = {
      id: row.id,
      estado: mapDbStatusToUi(row.estado),
      notes: row.notes ?? undefined,
      exit_notes: row.exit_notes ?? undefined, // Notas de seguridad
      loadPhoto: getFullImageUrl(row.loadPhoto),
      exitPhoto: getFullImageUrl(row.exitPhoto),
      exitLoadPhoto: getFullImageUrl(row.exitLoadPhoto),
      exitedAt: row.exited_at,
      orderDetails: {
        id: orderId,
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
      dispatchItems: [],
    };

    return NextResponse.json(finalPayload);
  } catch (e) {
    console.error("[API_DELIVERIES_ID_GET_ERROR]", util.inspect(e, { depth: null }));
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
    return NextResponse.json({ error: "Error al obtener el despacho", details: errorMessage }, { status: 500 });
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
    const notes = (formData.get("notes") as string) || null; // Notas de seguridad
    const userId = formData.get("userId") as string;

    if (!status || !userId) {
        return NextResponse.json({ error: "Faltan parámetros 'status' o 'userId'." }, { status: 400 });
    }
    
    const updateOrderStatus = async (currentDespachoId: number) => {
        try {
            const getOrderIdSql = "SELECT order_id FROM RIP.APP_DESPACHOS WHERE id = @despachoId;";
            const orderResult = await executeQuery(getOrderIdSql, [
                { name: "despachoId", type: TYPES.Int, value: currentDespachoId },
            ]);
            const orderId = orderResult[0]?.order_id;

            if (!orderId) return;
            
            const checkOrderSql = `
                IF NOT EXISTS (
                    SELECT 1
                    FROM RIP.APP_PEDIDOS_ITEMS pi
                    LEFT JOIN (
                        SELECT di.pedido_item_id, SUM(di.dispatched_quantity) as total_despachado
                        FROM RIP.APP_DESPACHOS_ITEMS di
                        JOIN RIP.APP_DESPACHOS d ON di.despacho_id = d.id
                        WHERE d.order_id = @orderId AND d.status = 'EXITED'
                        GROUP BY di.pedido_item_id
                    ) AS despachos_agg ON pi.id = despachos_agg.pedido_item_id
                    WHERE pi.order_id = @orderId
                    AND pi.quantity > ISNULL(despachos_agg.total_despachado, 0)
                )
                BEGIN
                    UPDATE RIP.APP_PEDIDOS SET status = 'DISPATCHED_COMPLETE' WHERE id = @orderId;
                END
                ELSE
                BEGIN
                    UPDATE RIP.APP_PEDIDOS SET status = 'PARTIALLY_DISPATCHED' WHERE id = @orderId;
                END
            `;
            await executeQuery(checkOrderSql, [
                { name: "orderId", type: TYPES.Int, value: orderId },
            ]);
        } catch (error) {
            console.error("Error actualizando el estado de la orden:", error);
        }
    };

    if (status === "CARGADA") {
        return NextResponse.json({error: "La lógica para 'CARGADA' debe ser implementada."}, {status: 400})

    } else if (status === "EXITED") {
        const exitPhotoFile = formData.get("exitPhoto") as File | null;
        const exitLoadPhotoFile = formData.get("exitLoadPhoto") as File | null;

        const validation = confirmExitSchema.safeParse({
            notes: notes,
            userId: userId,
            exitPhoto: exitPhotoFile,
            exitLoadPhoto: exitLoadPhotoFile,
        });

        if (!validation.success) {
            return NextResponse.json({ error: "Datos de confirmación de salida inválidos.", details: validation.error.flatten() }, { status: 400 });
        }
      
        const { exitPhoto, exitLoadPhoto } = validation.data;

        const saveFile = async (file: File, prefix: string): Promise<string> => {
            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = `${Date.now()}_${prefix}_${file.name.replace(/\s/g, "_")}`;
            const uploadDir = path.join(process.cwd(), "public/uploads");
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), buffer);
            return filename;
        }

        const exitPhotoUrl = exitPhoto ? await saveFile(exitPhoto, 'exit_truck') : null;
        const exitLoadPhotoUrl = exitLoadPhoto ? await saveFile(exitLoadPhoto, 'exit_load') : null;

        // Guarda las notas en la columna 'exit_notes'
        const updateDespachoSql = `
            UPDATE RIP.APP_DESPACHOS
            SET
                status = 'EXITED',
                exited_by = @userId,
                exited_at = GETDATE(),
                exit_notes = @notes,
                exit_photo_url = @exitPhotoUrl,
                exit_load_photo_url = @exitLoadPhotoUrl,
                updated_at = GETDATE()
            WHERE id = @despachoId;
        `;
        await executeQuery(updateDespachoSql, [
            { name: "despachoId", type: TYPES.Int, value: despachoId },
            { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
            { name: "notes", type: TYPES.NVarChar, value: notes },
            { name: "exitPhotoUrl", type: TYPES.NVarChar, value: exitPhotoUrl },
            { name: "exitLoadPhotoUrl", type: TYPES.NVarChar, value: exitLoadPhotoUrl },
        ]);

        await updateOrderStatus(despachoId);

    } else {
        return NextResponse.json({ error: `Estado '${status}' no manejado.` }, { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");

    // Llama a GET para devolver el objeto completo y con el formato correcto
    return await GET(request, { params });

  } catch (e) {
    if (e instanceof z.ZodError) {
        return NextResponse.json({ error: "Error de validación Zod.", details: e.flatten() }, { status: 400 });
    }
    console.error("[API_DELIVERIES_PATCH_ERROR]", e);
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
    return NextResponse.json({ error: "Error al actualizar el despacho", details: errorMessage }, { status: 500 });
  }
}