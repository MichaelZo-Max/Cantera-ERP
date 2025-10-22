// app/api/deliveries/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { Delivery, OrderItem, Invoice, DeliveryItem } from "@/lib/types";
import { createDeliverySchema } from "@/lib/validations";
import { getFullDeliveryById } from "./[id]/route"; // Importamos la función refactorizada

export const dynamic = "force-dynamic";

// --- Helpers ---

/**
 * ✨ CORRECCIÓN: Función auxiliar para formatear las URLs de las imágenes.
 */
const getFullImageUrl = (
  filename: string | null | undefined
): string | undefined => {
  if (!filename) return undefined;
  return `${filename}`;
};

function mapDbStatusToUi(status: string): "PENDING" | "CARGADA" | "EXITED" {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
}

// ======================= GET /api/deliveries (CORREGIDO Y REFACTORIZADO) =======================
export async function GET(_request: Request) {
  try {
    // ✨ REFACTORIZACIÓN (Paso 1): Obtener la lista principal de despachos.
    const deliveriesQuery = `
      SELECT
          d.id, d.status, d.notes, d.load_photo_url, d.exit_photo_url, d.exit_load_photo_url, d.exited_at, d.exit_notes,
          p.id AS order_id, p.order_number, p.customer_id, p.status AS order_status, p.created_at AS order_created_at,
          c.CODCLIENTE AS client_id, c.NOMBRECLIENTE AS client_name,
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
      JOIN RIP.APP_PEDIDOS p        ON p.id = d.order_id
      JOIN dbo.CLIENTES c           ON c.CODCLIENTE = p.customer_id
      LEFT JOIN RIP.APP_CAMIONES t  ON t.id = d.truck_id
      LEFT JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
      ORDER BY d.id DESC;
    `;
    const deliveryRows = await executeQuery(deliveriesQuery, []);

    if (deliveryRows.length === 0) {
      return NextResponse.json([]);
    }

    const deliveryIds = deliveryRows.map((d) => d.id);
    const orderIds = [...new Set(deliveryRows.map((d) => d.order_id))]; // IDs de órdenes únicos

    // ✨ REFACTORIZACIÓN (Paso 2): Obtener TODOS los items de despacho y de pedido en solo dos consultas.
    const dispatchItemsQuery = `
      SELECT di.id, di.dispatched_quantity, di.pedido_item_id, di.despacho_id
      FROM RIP.APP_DESPACHOS_ITEMS di
      WHERE di.despacho_id IN (${deliveryIds.join(",")});
    `;
    const orderItemsQuery = `
      SELECT
        oi.id, oi.product_id, oi.quantity, oi.unit, oi.price_per_unit, oi.order_id,
        prod.DESCRIPCION AS product_name
      FROM RIP.APP_PEDIDOS_ITEMS oi
      JOIN dbo.ARTICULOS prod ON prod.CODARTICULO = oi.product_id
      WHERE oi.order_id IN (${orderIds.join(",")});
    `;

    const [dispatchItemRows, orderItemRows] = await Promise.all([
      executeQuery(dispatchItemsQuery, []),
      executeQuery(orderItemsQuery, []),
    ]);

    // ✨ REFACTORIZACIÓN (Paso 3): Agrupar los items en mapas para un acceso rápido.
    const dispatchItemsByDeliveryId = new Map<number, DeliveryItem[]>();
    dispatchItemRows.forEach((item: any) => {
      const items = dispatchItemsByDeliveryId.get(item.despacho_id) || [];
      items.push({
        id: item.id,
        despacho_id: item.despacho_id,
        pedido_item_id: item.pedido_item_id,
        dispatched_quantity: item.dispatched_quantity,
      });
      dispatchItemsByDeliveryId.set(item.despacho_id, items);
    });

    const orderItemsByOrderId = new Map<number, OrderItem[]>();
    orderItemRows.forEach((item: any) => {
      const items = orderItemsByOrderId.get(item.order_id) || [];
      items.push({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        product: {
          id: item.product_id,
          name: item.product_name,
          unit: item.unit,
        },
        dispatchItems: [],
      });
      orderItemsByOrderId.set(item.order_id, items);
    });

    // ✨ REFACTORIZACIÓN (Paso 4): Combinar todos los datos.
    const deliveries: Delivery[] = deliveryRows.map((row) => {
      const invoices = row.order_invoices_json
        ? JSON.parse(row.order_invoices_json)
        : [];

      return {
        id: row.id,
        status: mapDbStatusToUi(row.status),
        notes: row.notes ?? undefined,
        exit_notes: row.exit_notes ?? undefined,
        exitedAt: row.exited_at ?? undefined,
        // ✨ CORRECCIÓN: Usar la función auxiliar para formatear las URLs
        loadPhoto: getFullImageUrl(row.load_photo_url),
        exitPhoto: getFullImageUrl(row.exit_photo_url),
        exitLoadPhoto: getFullImageUrl(row.exit_load_photo_url),
        orderDetails: {
          id: row.order_id,
          order_number: row.order_number,
          customer_id: row.customer_id,
          status: row.order_status,
          created_at: row.order_created_at,
          client: { id: row.client_id, name: row.client_name },
          items: orderItemsByOrderId.get(row.order_id) || [],
          invoices: invoices,
        },
        truck: { id: row.truck_id, placa: row.placa },
        driver: {
          id: row.driver_id,
          name: row.driver_name,
          phone: row.driver_phone ?? undefined,
        },
        dispatchItems: dispatchItemsByDeliveryId.get(row.id) || [],
      };
    });

    return NextResponse.json(deliveries);
  } catch (e) {
    console.error("[API_DELIVERIES_GET]", e);
    return new NextResponse("Error al obtener despachos", { status: 500 });
  }
}

// ======================= POST /api/deliveries (CORREGIDO) =======================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDeliverySchema.parse(body);
    const { order_id, truck_id, driver_id } = parsed;

    const insertQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status)
      OUTPUT INSERTED.id
      VALUES (@order_id, @truck_id, @driver_id, 'PENDING');
    `;
    const insertResult = await executeQuery(insertQuery, [
      { name: "order_id", type: TYPES.Int, value: order_id },
      { name: "truck_id", type: TYPES.Int, value: truck_id },
      { name: "driver_id", type: TYPES.Int, value: driver_id },
    ]);

    const newDeliveryId = insertResult[0]?.id;
    if (!newDeliveryId) {
      throw new Error("No se pudo crear el despacho en la base de datos.");
    }

    // --- 👇 LA SOLUCIÓN ---
    // Después de crear el despacho, obtenemos el objeto completo usando la función reutilizada.
    const fullNewDelivery = await getFullDeliveryById(newDeliveryId);

    if (!fullNewDelivery) {
      // Si no se puede obtener el despacho completo, es un error grave.
      throw new Error(
        `Se creó el despacho #${newDeliveryId}, pero no se pudo recuperar su información completa.`
      );
    }

    revalidateTag("deliveries");
    // Devolvemos el objeto completo al frontend.
    return NextResponse.json(fullNewDelivery, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(e.errors), { status: 400 });
    }
    console.error("[API_DELIVERIES_POST]", e);
    return new NextResponse("Error al crear el despacho", { status: 500 });
  }
}
