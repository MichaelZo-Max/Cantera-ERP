// app/api/deliveries/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { Delivery } from "@/lib/types";

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

// ======================= GET /api/deliveries =======================
export async function GET(_request: Request) {
  try {
    // Listado de despachos + info relacionada (SIN WHERE)
    const listQuery = `
      SELECT
          d.id                              AS delivery_id,
          d.status                          AS estado,
          d.notes                           AS notes,
          d.load_photo_url                  AS loadPhoto,
          d.exit_photo_url                  AS exitPhoto,

          p.id                              AS order_id,
          p.order_number                    AS order_number,
          p.customer_id                     AS customer_id,
          p.status                          AS order_status,
          p.created_at                      AS order_created_at,

          c.id                              AS client_id,
          c.name                            AS client_name,

          t.id                              AS truck_id,
          t.placa                           AS placa,

          dr.id                             AS driver_id,
          dr.name                           AS driver_name,
          dr.phone                          AS driver_phone,

          oi.id                             AS pedido_item_id,
          oi.product_id                     AS product_id,
          oi.quantity                       AS cantidadSolicitada,
          oi.unit                           AS unit,
          oi.price_per_unit                 AS price_per_unit,

          prod.id                           AS product_id_from_prod,
          prod.name                         AS product_name
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p          ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c      ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t         ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr        ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS oi ON oi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
      ORDER BY d.id DESC, oi.id ASC
    `;

    const rows = await executeQuery(listQuery, []); // ✅ argumentos completos

    // Agrupar por delivery_id → Delivery (contrato del front)
    const deliveriesMap = new Map<number, Delivery>();

    for (const row of rows) {
      if (!deliveriesMap.has(row.delivery_id)) {
        deliveriesMap.set(row.delivery_id, {
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
            client: {
              id: row.client_id,
              name: row.client_name,
            },
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

      const d = deliveriesMap.get(row.delivery_id)!;

      // Agregar items del pedido (si hay)
      if (row.pedido_item_id) {
        d.orderDetails.items.push({
          id: row.pedido_item_id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.cantidadSolicitada,
          unit: row.unit,
          price_per_unit: row.price_per_unit,
          product: {
            id: row.product_id_from_prod ?? row.product_id,
            name: row.product_name,
            unit: row.unit,
          },
          dispatchItems: [], // (opcional) poblar en otra consulta si hace falta
        });
      }
    }

    return NextResponse.json(Array.from(deliveriesMap.values()));
  } catch (e) {
    console.error("[API_DELIVERIES_GET]", e);
    return new NextResponse("Error al obtener despachos", { status: 500 });
  }
}

// Acepta snake_case (front) o camelCase (compat)
const createDeliverySchema = z.object({
  order_id: z.number().int().positive().optional(),
  truck_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  orderId: z.number().int().positive().optional(),
  truckId: z.number().int().positive().optional(),
  driverId: z.number().int().positive().optional(),
}).refine(
  (v) =>
    (v.order_id ?? v.orderId) &&
    (v.truck_id ?? v.truckId) &&
    (v.driver_id ?? v.driverId),
  { message: "order_id, truck_id y driver_id son requeridos" }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDeliverySchema.parse(body);

    const orderId = parsed.order_id ?? parsed.orderId!;
    const truckId = parsed.truck_id ?? parsed.truckId!;
    const driverId = parsed.driver_id ?? parsed.driverId!;

    // ⚠️ Sin aliases dentro del OUTPUT. Usamos tabla temporal para capturar el id.
    const insertAndSelectQuery = `
      DECLARE @new TABLE (id INT);
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status, created_at)
      OUTPUT INSERTED.id INTO @new(id)
      VALUES (@orderId, @truckId, @driverId, 'PENDIENTE', GETDATE());

      SELECT 
        d.id                               AS delivery_id,
        d.status                           AS estado,
        d.notes                            AS notes,
        d.load_photo_url                   AS loadPhoto,
        d.exit_photo_url                   AS exitPhoto,

        p.id                               AS order_id,
        p.order_number                     AS order_number,
        p.customer_id                      AS customer_id,
        p.status                           AS order_status,
        p.created_at                       AS order_created_at,

        c.id                               AS client_id,
        c.name                             AS client_name,

        t.id                               AS truck_id,
        t.placa                            AS placa,

        dr.id                              AS driver_id,
        dr.name                            AS driver_name,
        dr.phone                           AS driver_phone
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p            ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c        ON c.id = p.customer_id
      LEFT JOIN RIP.APP_CAMIONES t      ON t.id = d.truck_id
      LEFT JOIN RIP.APP_CHOFERES dr     ON dr.id = d.driver_id
      WHERE d.id = (SELECT TOP 1 id FROM @new);
    `;

    const rows = await executeQuery(insertAndSelectQuery, [
      { name: "orderId", type: TYPES.Int, value: orderId },
      { name: "truckId", type: TYPES.Int, value: truckId },
      { name: "driverId", type: TYPES.Int, value: driverId },
    ]);

    const r = rows[0];
    // Mapeo al contrato del front (Delivery con orderDetails) — coincide con tu UI:contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
    const payload: Delivery = {
      delivery_id: r.delivery_id,
      estado: mapDbStatusToUi(r.estado),
      notes: r.notes ?? undefined,
      loadPhoto: r.loadPhoto ?? undefined,
      exitPhoto: r.exitPhoto ?? undefined,
      orderDetails: {
        id: r.order_id,
        order_number: r.order_number,
        customer_id: r.customer_id,
        status: r.order_status,
        created_at: r.order_created_at,
        client: { id: r.client_id, name: r.client_name },
        items: [], // si necesitas, puedes cargar items aparte
      },
      truck: { id: r.truck_id, placa: r.placa },
      driver: { id: r.driver_id, name: r.driver_name, phone: r.driver_phone ?? undefined },
    };

    revalidateTag("deliveries");
    return NextResponse.json(payload, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(e.errors), { status: 400 });
    }
    console.error("[API_DELIVERIES_POST]", e);
    return new NextResponse("Error al crear el despacho", { status: 500 });
  }
}