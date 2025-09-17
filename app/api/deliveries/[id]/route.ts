// app/api/deliveries/[id]/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery } from "@/lib/types";
import util from "util";
import { confirmLoadSchema } from "@/lib/validations"; // ✨ IMPORTADO
import { z } from "zod"; // ✨ IMPORTADO

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

    const getDeliveryQuery = `
      SELECT
        d.id                    AS delivery_id,
        d.status                AS estado,
        d.notes                 AS notes,
        d.load_photo_url        AS loadPhoto,
        d.exit_photo_url        AS exitPhoto,
        p.id                    AS order_id,
        p.order_number          AS order_number,
        p.customer_id           AS customer_id,
        p.status                AS order_status,
        p.created_at            AS order_created_at,
        c.id                    AS client_id,
        c.name                  AS client_name,
        t.id                    AS truck_id,
        t.placa                 AS placa,
        dr.id                   AS driver_id,
        dr.name                 AS driver_name,
        dr.phone                AS driver_phone,
        oi.id                   AS pedido_item_id,
        oi.product_id           AS product_id,
        oi.quantity             AS cantidadSolicitada,
        oi.unit                 AS unit,
        oi.price_per_unit       AS price_per_unit,
        prod.name               AS product_name,
        di.id                   AS dispatch_item_id,
        di.dispatched_quantity  AS dispatched_quantity
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p              ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c          ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t             ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr            ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS oi  ON oi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
      LEFT JOIN RIP.APP_DESPACHOS_ITEMS di ON di.pedido_item_id = oi.id AND di.despacho_id = d.id
      WHERE d.id = @id
      ORDER BY oi.id ASC
    `;
    const rows = await executeQuery(getDeliveryQuery, [
      { name: "id", type: TYPES.Int, value: despachoId },
    ]);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró el despacho." },
        { status: 404 }
      );
    }

    // Mapeo para construir el objeto de delivery anidado
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
          driver: {
            id: row.driver_id,
            name: row.driver_name,
            phone: row.driver_phone ?? undefined,
          },
        });
      }

      const delivery = deliveryMap.get(row.delivery_id)!;
      if (
        row.pedido_item_id &&
        !delivery.orderDetails.items.some((i) => i.id === row.pedido_item_id)
      ) {
        delivery.orderDetails.items.push({
          id: row.pedido_item_id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.cantidadSolicitada,
          unit: row.unit,
          price_per_unit: row.price_per_unit,
          product: {
            id: row.product_id,
            name: row.product_name,
            unit: row.unit,
          },
          dispatchItems: [],
        });
      }

      if (row.dispatch_item_id) {
        const orderItem = delivery.orderDetails.items.find(
          (i) => i.id === row.pedido_item_id
        );
        if (
          orderItem &&
          Array.isArray(orderItem.dispatchItems) &&
          !orderItem.dispatchItems.some((di) => di.id === row.dispatch_item_id)
        ) {
          orderItem.dispatchItems.push({
            id: row.dispatch_item_id,
            despacho_id: despachoId,
            pedido_item_id: row.pedido_item_id,
            dispatched_quantity: row.dispatched_quantity,
          });
        }
      }
    }

    const finalPayload = Array.from(deliveryMap.values())[0];

    // --- LÓGICA PARA CALCULAR EL TOTAL YA DESPACHADO ---
    if (finalPayload && finalPayload.orderDetails.items.length > 0) {
      const currentOrderItemId = finalPayload.orderDetails.items[0].id;

      const dispatchedSumSql = `
        SELECT SUM(ISNULL(di.dispatched_quantity, 0)) as totalDispatched
        FROM RIP.APP_DESPACHOS_ITEMS di
        JOIN RIP.APP_DESPACHOS d ON di.despacho_id = d.id
        WHERE di.pedido_item_id = @pedidoItemId AND d.id != @currentDespachoId
      `;

      const sumResult = await executeQuery(dispatchedSumSql, [
        { name: "pedidoItemId", type: TYPES.Int, value: currentOrderItemId },
        { name: "currentDespachoId", type: TYPES.Int, value: despachoId },
      ]);

      // Añadimos el nuevo campo al objeto que se devolverá
      (finalPayload as any).totalDispatched =
        sumResult[0]?.totalDispatched ?? 0;
    } else {
      (finalPayload as any).totalDispatched = 0;
    }
    // --- FIN DE LA LÓGICA ---

    return NextResponse.json(finalPayload);
  } catch (e) {
    console.error(
      "[API_DELIVERIES_GET_ERROR]",
      util.inspect(e, { depth: null })
    );
    const errorMessage =
      e instanceof Error
        ? e.message
        : "Ocurrió un error inesperado en el servidor.";
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
      return NextResponse.json(
        { error: "ID de despacho inválido" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const status = formData.get("status") as string;
    const notes = (formData.get("notes") as string | null) ?? null;
    const userId = formData.get("userId") as string;
    const photoFile = formData.get("photoFile") as File | null;
    const itemsJson = formData.get("itemsJson") as string | null;

    if (!status || !userId) {
      return NextResponse.json(
        { error: "Faltan parámetros 'status' o 'userId'." },
        { status: 400 }
      );
    }

    if (status === "CARGADA") {
        
        // ✨ --- INICIO DE LA VALIDACIÓN CON ZOD --- ✨
        
        const parsedItems = itemsJson ? JSON.parse(itemsJson) : [];
        const validation = confirmLoadSchema.safeParse({
            notes: notes ?? undefined,
            loadPhoto: photoFile,
            loadedItems: parsedItems,
        });

        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de confirmación de carga inválidos.", 
                    details: validation.error.flatten() 
                }, 
                { status: 400 }
            );
        }
        
        const { loadedItems } = validation.data;

        // --- VALIDACIÓN DE CANTIDADES EN BACKEND ---
        for (const item of loadedItems) {
            const { pedido_item_id, dispatched_quantity } = item;

            if (dispatched_quantity < 0) {
                return NextResponse.json(
                    { error: `La cantidad para el producto no puede ser negativa.` },
                    { status: 400 }
                );
            }
            if (dispatched_quantity === 0) continue;

            const validationSql = `
                DECLARE @totalOrdered FLOAT = (
                    SELECT quantity 
                    FROM RIP.APP_PEDIDOS_ITEMS 
                    WHERE id = @pedidoItemId
                );

                DECLARE @totalDispatched FLOAT = (
                    SELECT SUM(ISNULL(di.dispatched_quantity, 0))
                    FROM RIP.APP_DESPACHOS_ITEMS di
                    JOIN RIP.APP_DESPACHOS d ON di.despacho_id = d.id
                    WHERE di.pedido_item_id = @pedidoItemId AND d.id != @despachoId
                );

                SELECT 
                    @totalOrdered as totalOrdered, 
                    ISNULL(@totalDispatched, 0) as totalDispatched;
            `;

            const validationResult = await executeQuery(validationSql, [
                { name: "pedidoItemId", type: TYPES.Int, value: parseInt(pedido_item_id, 10) },
                { name: "despachoId", type: TYPES.Int, value: despachoId },
            ]);

            if (!validationResult || validationResult.length === 0) {
                return NextResponse.json(
                    {
                        error: `No se pudo validar el producto con ID de item ${pedido_item_id}.`,
                    },
                    { status: 404 }
                );
            }

            const { totalOrdered, totalDispatched } = validationResult[0];
            const pendingQuantity = totalOrdered - totalDispatched;

            if (dispatched_quantity > pendingQuantity) {
                const productInfoSql = `
                    SELECT p.name 
                    FROM RIP.VW_APP_PRODUCTOS p 
                    JOIN RIP.APP_PEDIDOS_ITEMS pi ON p.id = pi.product_id 
                    WHERE pi.id = @pedidoItemId
                `;
                const productInfoResult = await executeQuery(productInfoSql, [
                    { name: "pedidoItemId", type: TYPES.Int, value: parseInt(pedido_item_id, 10) },
                ]);
                const productName = productInfoResult[0]?.name || "un producto";

                return NextResponse.json(
                    {
                        error: `La cantidad para ${productName} (${dispatched_quantity}) supera lo pendiente (${pendingQuantity.toFixed(2)}). Refresca la página.`,
                    },
                    { status: 400 }
                );
            }
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

        // 1. Actualizar el despacho
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

        // 2. Borrar items viejos para evitar duplicados al editar
        const deleteItemsSql =
            "DELETE FROM RIP.APP_DESPACHOS_ITEMS WHERE despacho_id = @despachoId;";
        await executeQuery(deleteItemsSql, [
            { name: "despachoId", type: TYPES.Int, value: despachoId },
        ]);

        // 3. Insertar los items nuevos
        for (const item of loadedItems) {
            if (item.dispatched_quantity > 0) {
                const insertItemSql = `
                    INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
                    VALUES (@despachoId, @pedidoItemId, @quantity);
                `;
                await executeQuery(insertItemSql, [
                    { name: "despachoId", type: TYPES.Int, value: despachoId },
                    {
                        name: "pedidoItemId",
                        type: TYPES.Int,
                        value: parseInt(item.pedido_item_id, 10),
                    },
                    {
                        name: "quantity",
                        type: TYPES.Decimal,
                        value: item.dispatched_quantity,
                    },
                ]);
            }
        }
    } else if (status === 'EXITED') {
        // ... (resto del código sin cambios)
    } else {
      return NextResponse.json(
        { error: `Estado '${status}' no manejado.` },
        { status: 400 }
      );
    }

    revalidateTag("deliveries");
    revalidateTag("orders");

    const getUpdatedDeliveryQuery = `
      SELECT
        d.id                    AS delivery_id,
        d.status                AS estado,
        d.notes                 AS notes,
        d.load_photo_url        AS loadPhoto,
        d.exit_photo_url        AS exitPhoto,
        p.id                    AS order_id,
        p.order_number          AS order_number,
        p.customer_id           AS customer_id,
        p.status                AS order_status,
        p.created_at            AS order_created_at,
        c.id                    AS client_id,
        c.name                  AS client_name,
        t.id                    AS truck_id,
        t.placa                 AS placa,
        dr.id                   AS driver_id,
        dr.name                 AS driver_name,
        dr.phone                AS driver_phone,
        oi.id                   AS pedido_item_id,
        oi.product_id           AS product_id,
        oi.quantity             AS cantidadSolicitada,
        oi.unit                 AS unit,
        oi.price_per_unit       AS price_per_unit,
        prod.name               AS product_name,
        di.id                   AS dispatch_item_id,
        di.dispatched_quantity  AS dispatched_quantity
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p              ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c          ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t             ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr            ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS oi  ON oi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
      LEFT JOIN RIP.APP_DESPACHOS_ITEMS di ON di.pedido_item_id = oi.id AND di.despacho_id = d.id
      WHERE d.id = @id
      ORDER BY oi.id ASC
    `;

    const rows = await executeQuery(getUpdatedDeliveryQuery, [
      { name: "id", type: TYPES.Int, value: despachoId },
    ]);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró el despacho después de la actualización." },
        { status: 404 }
      );
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
          driver: {
            id: row.driver_id,
            name: row.driver_name,
            phone: row.driver_phone ?? undefined,
          },
        });
      }

      const delivery = deliveryMap.get(row.delivery_id)!;

      if (
        row.pedido_item_id &&
        !delivery.orderDetails.items.some((i) => i.id === row.pedido_item_id)
      ) {
        delivery.orderDetails.items.push({
          id: row.pedido_item_id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.cantidadSolicitada,
          unit: row.unit,
          price_per_unit: row.price_per_unit,
          product: {
            id: row.product_id,
            name: row.product_name,
            unit: row.unit,
          },
          dispatchItems: [],
        });
      }

      if (row.dispatch_item_id) {
        const orderItem = delivery.orderDetails.items.find(
          (i) => i.id === row.pedido_item_id
        );
        if (
          orderItem &&
          Array.isArray(orderItem.dispatchItems) &&
          !orderItem.dispatchItems.some((di) => di.id === row.dispatch_item_id)
        ) {
          orderItem.dispatchItems.push({
            id: row.dispatch_item_id,
            despacho_id: despachoId,
            pedido_item_id: row.pedido_item_id,
            dispatched_quantity: row.dispatched_quantity,
          });
        }
      }
    }

    const finalPayload = Array.from(deliveryMap.values())[0];

    return NextResponse.json(finalPayload);
  } catch (e) {
    if (e instanceof z.ZodError) {
        // ✨ MANEJO DE ERRORES DE ZOD
        return NextResponse.json(
            { 
                error: "Error de validación.", 
                details: e.flatten() 
            }, 
            { status: 400 }
        );
    }
    console.error(
      "[API_DELIVERIES_PATCH_ERROR]",
      util.inspect(e, { depth: null })
    );
    const errorMessage =
      e instanceof Error
        ? e.message
        : "Ocurrió un error inesperado en el servidor.";
    // Aquí devolvemos el error como JSON para que el frontend pueda leerlo
    return NextResponse.json(
      { error: "Error al actualizar el despacho", details: errorMessage },
      { status: 500 }
    );
  }
}