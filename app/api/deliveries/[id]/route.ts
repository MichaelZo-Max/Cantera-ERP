// app/api/deliveries/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery } from "@/lib/types";
import util from 'util';

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
    
    if (status === 'CARGADA' && (!itemsJson || !photoFile)) {
        return NextResponse.json({ error: "Para marcar como 'CARGADA', se requieren los items y la foto." }, { status: 400 });
    }

    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    if (status === "CARGADA") {
        const parsedItems: Array<{ pedido_item_id: string | number; dispatched_quantity: number; }> = JSON.parse(itemsJson!);
        
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

        const insertItemSql = `
            INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
            VALUES (@despachoId, @pedidoItemId, @quantity);
        `;
        for (const item of parsedItems) {
            await executeQuery(insertItemSql, [
            { name: "despachoId", type: TYPES.Int, value: despachoId },
            { name: "pedidoItemId", type: TYPES.Int, value: parseInt(String(item.pedido_item_id), 10) },
            { name: "quantity", type: TYPES.Decimal, value: item.dispatched_quantity },
            ]);
        }
    } 
    else {
        return NextResponse.json({ error: `Estado '${status}' no manejado.` }, { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");
    
    const getUpdatedDeliveryQuery = `
      SELECT
        d.id                          AS delivery_id,
        d.status                      AS estado,
        d.notes                       AS notes,
        d.load_photo_url              AS loadPhoto,
        d.exit_photo_url              AS exitPhoto,
        p.id                          AS order_id,
        p.order_number                AS order_number,
        p.customer_id                 AS customer_id,
        p.status                      AS order_status,
        p.created_at                  AS order_created_at,
        c.id                          AS client_id,
        c.name                        AS client_name,
        t.id                          AS truck_id,
        t.placa                       AS placa,
        dr.id                         AS driver_id,
        dr.name                       AS driver_name,
        dr.phone                      AS driver_phone,
        oi.id                         AS pedido_item_id,
        oi.product_id                 AS product_id,
        oi.quantity                   AS cantidadSolicitada,
        oi.unit                       AS unit,
        oi.price_per_unit             AS price_per_unit,
        prod.name                     AS product_name,
        di.id                         AS dispatch_item_id,
        di.dispatched_quantity        AS dispatched_quantity
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p              ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c          ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t             ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr            ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS oi  ON oi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
      LEFT JOIN RIP.APP_DESPACHOS_ITEMS di ON di.pedido_item_id = oi.id
      WHERE d.id = @id
      ORDER BY oi.id ASC
    `;

    const rows = await executeQuery(getUpdatedDeliveryQuery, [{ name: "id", type: TYPES.Int, value: despachoId }]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No se encontró el despacho después de la actualización." }, { status: 404 });
    }

    const deliveryMap = new Map<number, Delivery>();
    for (const row of rows) {
        if (!deliveryMap.has(row.delivery_id)) {
            deliveryMap.set(row.delivery_id, {
                delivery_id: row.delivery_id,
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
                    items: [],
                },
                truck: { id: row.truck_id, placa: row.placa },
                driver: { id: row.driver_id, name: row.driver_name, phone: row.driver_phone ?? undefined },
            });
        }

        const delivery = deliveryMap.get(row.delivery_id)!;
        
        if (row.pedido_item_id && !delivery.orderDetails.items.some(i => i.id === row.pedido_item_id)) {
            delivery.orderDetails.items.push({
                id: row.pedido_item_id,
                order_id: row.order_id,
                product_id: row.product_id,
                quantity: row.cantidadSolicitada,
                unit: row.unit,
                price_per_unit: row.price_per_unit,
                product: { id: row.product_id, name: row.product_name, unit: row.unit },
                dispatchItems: [], 
            });
        }

        if (row.dispatch_item_id) {
            const orderItem = delivery.orderDetails.items.find(i => i.id === row.pedido_item_id);
            // --- INICIO DE LA CORRECCIÓN ---
            // Añadimos una comprobación para asegurar que `dispatchItems` es un array
            if (orderItem && Array.isArray(orderItem.dispatchItems) && !orderItem.dispatchItems.some(di => di.id === row.dispatch_item_id)) {
                orderItem.dispatchItems.push({
                    id: row.dispatch_item_id,
                    despacho_id: despachoId,
                    pedido_item_id: row.pedido_item_id,
                    dispatched_quantity: row.dispatched_quantity,
                });
            }
            // --- FIN DE LA CORRECCIÓN ---
        }
    }
    
    const finalPayload = Array.from(deliveryMap.values())[0];

    return NextResponse.json(finalPayload);

  } catch (e) {
    console.error("[API_DELIVERIES_PATCH_ERROR]", util.inspect(e, { depth: null }));
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado en el servidor.";
    return NextResponse.json({ error: "Error al actualizar el despacho", details: errorMessage }, { status: 500 });
  }
}