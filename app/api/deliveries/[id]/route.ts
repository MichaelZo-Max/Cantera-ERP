// app/api/deliveries/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";
import { Delivery } from "@/lib/types";
import util from 'util';

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

// --- PATCH (Función Corregida y Robustecida) ---
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
    
    // Si el estado es CARGADA, los items y la foto son obligatorios
    if (status === 'CARGADA' && (!itemsJson || !photoFile)) {
        return NextResponse.json({ error: "Para marcar como 'CARGADA', se requieren los items y la foto." }, { status: 400 });
    }

    // Procesar la foto si existe
    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    // Lógica para el estado CARGADA
    if (status === "CARGADA") {
        const parsedItems: Array<{ pedido_item_id: string | number; dispatched_quantity: number; }> = JSON.parse(itemsJson!);
        
        // 1. Actualizar el encabezado del despacho
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

        // 2. Insertar los items despachados
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
    // Aquí puedes añadir la lógica para otros estados como "EXITED" si es necesario
    else {
        return NextResponse.json({ error: `Estado '${status}' no manejado.` }, { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");
    
    // --- Devolver el despacho actualizado (Consulta Corregida) ---
    const getUpdatedDeliveryQuery = `
      SELECT
          d.id as delivery_id, d.status as estado, d.notes, d.load_photo_url as loadPhoto,
          d.exit_photo_url as exitPhoto,
          p.id as order_id, p.order_number, p.status as orderStatus, p.created_at as orderCreatedAt, p.customer_id,
          c.id as client_id, c.name as client_name,
          t.id as truck_id, t.placa,
          dr.id as driver_id, dr.name as driver_name, dr.phone as driver_phone
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
      WHERE d.id = @id
    `;
    const updatedDeliveryRows = await executeQuery(getUpdatedDeliveryQuery, [
      { name: "id", type: TYPES.Int, value: despachoId },
    ]);

    if (!updatedDeliveryRows || updatedDeliveryRows.length === 0) {
      return NextResponse.json({ error: "No se encontró el despacho después de la actualización." }, { status: 404 });
    }

    // Para la respuesta, no necesitamos todos los joins, solo el estado actualizado del despacho
    const finalDeliveryState = {
        ...updatedDeliveryRows[0],
        estado: mapDbStatusToUi(updatedDeliveryRows[0].estado),
        // Aquí puedes re-hidratar el objeto 'Delivery' completo si es necesario para la UI
    };

    return NextResponse.json(finalDeliveryState);

  } catch (e) {
    // --- MANEJO DE ERRORES MEJORADO ---
    // Imprimimos el error completo en el servidor para un diagnóstico detallado
    console.error("[API_DELIVERIES_PATCH_ERROR]", util.inspect(e, { depth: null }));
    
    // Devolvemos siempre una respuesta JSON con el mensaje de error
    const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado en el servidor.";
    return NextResponse.json({ error: "Error al actualizar el despacho", details: errorMessage }, { status: 500 });
  }
}