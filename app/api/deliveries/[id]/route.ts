// app/api/deliveries/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery } from "@/lib/types";

export const dynamic = "force-dynamic";

// --- Helpers (mapeos solo a nivel de DTO, sin tocar SQL) ---
function mapDbStatusToUi(status: string): "PENDING" | "CARGADA" | "EXITED" {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
}

function coalesce<T>(v: T | null | undefined, fallback: T): T {
  return v == null ? fallback : v;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const despachoId = parseInt(params.id, 10);
    if (isNaN(despachoId)) {
      return new NextResponse("ID de despacho inválido", { status: 400 });
    }

    const formData = await request.formData();
    const status = formData.get("status") as string;
    const notes = (formData.get("notes") as string | null) ?? null;
    const userId = formData.get("userId") as string;
    const photoFile = formData.get("photoFile") as File | null;

    // ⚠️ El front envía "itemsJson" (no "items")
    // ver YardDeliveriesClientUI → formData.append("itemsJson", JSON.stringify(itemsToDispatch))
    const itemsJson =
      (formData.get("itemsJson") as string | null) ??
      (formData.get("items") as string | null); // fallback por si acaso
    const parsedItems: Array<{
      pedido_item_id: string | number;
      dispatched_quantity: number;
    }> | null = itemsJson ? JSON.parse(itemsJson) : null;

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
      if (!userId || !parsedItems || parsedItems.length === 0) {
        return new NextResponse("Faltan datos para confirmar la carga", {
          status: 400,
        });
      }

      // 1) Actualizar encabezado del despacho
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

      // 2) Insertar items: el front manda pedido_item_id y dispatched_quantity.
      //    Necesitamos productId y unit desde la tabla de items de pedido.
      const selectPedidoItemSql = `
        SELECT 
          pi.product_id      AS product_id,
          pi.unit            AS unit
        FROM RIP.APP_PEDIDOS_ITEMS pi
        WHERE pi.id = @pedidoItemId
      `;

      const insertItemSql = `
        INSERT INTO RIP.APP_DESPACHOS_ITEMS 
          (despacho_id, producto_id, cantidad, unidad, created_by, created_at)
        VALUES 
          (@despachoId, @productId, @quantity, @unit, @userId, GETDATE());
      `;

      for (const item of parsedItems) {
        const pedidoItemId = parseInt(String(item.pedido_item_id), 10);
        if (!pedidoItemId || isNaN(pedidoItemId)) continue;

        const piRows = await executeQuery(selectPedidoItemSql, [
          { name: "pedidoItemId", type: TYPES.Int, value: pedidoItemId },
        ]);

        if (!piRows || piRows.length === 0) {
          // Si no encontramos el item, omitimos este registro.
          // (Opcional: podrías lanzar error si quieres forzar consistencia.)
          continue;
        }

        const { product_id, unit } = piRows[0];
        const quantity = Number(item.dispatched_quantity) || 0;
        if (quantity <= 0) continue;

        await executeQuery(insertItemSql, [
          { name: "despachoId", type: TYPES.Int, value: despachoId },
          { name: "productId", type: TYPES.Int, value: product_id },
          { name: "quantity", type: TYPES.Decimal, value: quantity },
          { name: "unit", type: TYPES.NVarChar, value: unit },
          { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
        ]);
      }
    } else if (status === "SALIDA_OK" || status === "EXITED") {
      if (!userId)
        return new NextResponse("ID de usuario requerido", { status: 400 });

      const sql = `UPDATE RIP.APP_DESPACHOS
                       SET status='SALIDA_OK',
                           exited_by=@userId,
                           exited_at=GETDATE(),
                           notes=ISNULL(@notes, notes),
                           ${photoUrl ? "exit_photo_url=@photoUrl," : ""}
                           updated_at=GETDATE()
                       WHERE id=@id`;
      const p = [
        { name: "id", type: TYPES.Int, value: despachoId },
        { name: "notes", type: TYPES.NVarChar, value: notes ?? null },
        { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
      ];
      if (photoUrl) {
        p.push({ name: "photoUrl", type: TYPES.NVarChar, value: photoUrl });
      }
      await executeQuery(sql, p);
    } else {
      return new NextResponse("Estado no manejado", { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");

    // --- Devolver el despacho actualizado, mapeado a Delivery del front (orderDetails) ---
    const getUpdatedDeliveryQuery = `
      SELECT
          d.id as delivery_id, d.status as estado, d.notes, d.load_photo_url as loadPhoto,
          d.exit_photo_url as exitPhoto,
          p.id as order_id, p.order_number as orderNumber, p.status as orderStatus, p.created_at as orderCreatedAt, p.customer_id,
          c.id as client_id, c.name as client_name,
          t.id as truck_id, t.placa,
          dr.id as driver_id, dr.name as driver_name, dr.phone as driver_phone,
          pi.id as pedido_item_id,
          pi.quantity as cantidadSolicitada,
          pi.unit,
          pi.price_per_unit,
          prod.id as product_id,
          prod.name as product_name
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = pi.product_id
      WHERE d.id = @id
    `;
    const updatedDeliveryRows = await executeQuery(getUpdatedDeliveryQuery, [
      { name: "id", type: TYPES.Int, value: despachoId },
    ]);

    if (!updatedDeliveryRows || updatedDeliveryRows.length === 0) {
      return new NextResponse(
        "No se encontró el despacho después de la actualización",
        { status: 404 }
      );
    }

    const firstRow = updatedDeliveryRows[0];

    // Construimos el payload final según el tipo Delivery del front:
    // - propiedad "orderDetails" (no "order")
    // - estados normalizados a "PENDING" | "CARGADA" | "EXITED"
    const finalDeliveryState: Delivery = {
      delivery_id: firstRow.delivery_id,
      estado: mapDbStatusToUi(firstRow.estado),
      notes: firstRow.notes ?? undefined,
      loadPhoto: firstRow.loadPhoto ?? undefined,
      exitPhoto: firstRow.exitPhoto ?? undefined,
      orderDetails: {
        id: firstRow.order_id,
        order_number: firstRow.orderNumber,
        customer_id: firstRow.customer_id,
        status: firstRow.orderStatus,
        created_at: firstRow.orderCreatedAt,
        client: { id: firstRow.client_id, name: firstRow.client_name },
        items: [],
      },
      truck: { id: firstRow.truck_id, placa: firstRow.placa },
      driver: {
        id: firstRow.driver_id,
        name: firstRow.driver_name,
        phone: firstRow.driver_phone ?? undefined,
      },
    };

    for (const row of updatedDeliveryRows) {
      if (row.pedido_item_id) {
        finalDeliveryState.orderDetails.items.push({
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
          dispatchItems: [], // si quieres, puedes poblarlo en otra consulta
        });
      }
    }

    return NextResponse.json(finalDeliveryState);
  } catch (e) {
    console.error("[API_DELIVERIES_PATCH]", e);
    const errorMessage = e instanceof Error ? e.message : "Error desconocido";
    return new NextResponse(
      `Error al actualizar el despacho: ${errorMessage}`,
      { status: 500 }
    );
  }
}
