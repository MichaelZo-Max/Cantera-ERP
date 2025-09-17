// app/api/deliveries/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { Delivery, OrderItem } from "@/lib/types"; // Importar OrderItem

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
    // --- INICIO DE LA MODIFICACIÓN ---
    // Consulta modificada para incluir los items de cada despacho (viaje)
    const listQuery = `
      SELECT
          d.id                       AS delivery_id,
          d.status                   AS estado,
          d.notes                    AS notes,
          d.load_photo_url           AS loadPhoto,
          d.exit_photo_url           AS exitPhoto,
          p.id                       AS order_id,
          p.order_number,
          p.customer_id,
          p.status                   AS order_status,
          p.created_at               AS order_created_at,
          c.id                       AS client_id,
          c.name                     AS client_name,
          t.id                       AS truck_id,
          t.placa,
          dr.id                      AS driver_id,
          dr.name                    AS driver_name,
          dr.phone                   AS driver_phone,
          oi.id                      AS pedido_item_id,
          oi.product_id,
          oi.quantity                AS cantidadSolicitada,
          oi.unit,
          oi.price_per_unit,
          prod.name                  AS product_name,
          
          -- Campos de los items despachados
          di.id                      AS dispatch_item_id,
          di.dispatched_quantity,
          di.pedido_item_id          AS dispatched_pedido_item_id

      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p              ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c          ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t             ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr            ON dr.id = d.driver_id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS oi  ON oi.order_id = p.id
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
      -- Unimos los items del despacho directamente con el despacho
      LEFT JOIN RIP.APP_DESPACHOS_ITEMS di ON di.despacho_id = d.id
      ORDER BY d.id DESC, oi.id ASC;
    `;

    const rows = await executeQuery(listQuery, []);

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
            client: { id: row.client_id, name: row.client_name },
            items: [],
          },
          truck: { id: row.truck_id, placa: row.placa },
          driver: {
            id: row.driver_id,
            name: row.driver_name,
            phone: row.driver_phone ?? undefined,
          },
          dispatchItems: [],
        });
      }

      const d = deliveriesMap.get(row.delivery_id)!;

      // Poblar la lista COMPLETA de items del pedido, evitando duplicados.
      if (
        row.pedido_item_id &&
        !d.orderDetails.items.some((i) => i.id === row.pedido_item_id)
      ) {
        d.orderDetails.items.push({
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
          dispatchItems: [], // Por consistencia del tipo OrderItem
        });
      }
    }

    // PASO 2: Construir la lista de items despachados (dispatchItems).
    // Ahora que `orderDetails.items` está completo para cada pedido, podemos buscar de forma segura.
    for (const row of rows) {
      if (row.dispatch_item_id) {
        const d = deliveriesMap.get(row.delivery_id)!;

        if (!d.dispatchItems?.some((di) => di.id === row.dispatch_item_id)) {
          // Buscamos el item del pedido correspondiente en la lista que ya construimos.
          const orderItem = d.orderDetails.items.find(
            (item) => item.id === row.dispatched_pedido_item_id
          );

          // Solo añadimos el item despachado si encontramos su correspondiente `orderItem`
          if (orderItem) {
            d.dispatchItems?.push({
              id: row.dispatch_item_id,
              despacho_id: row.delivery_id,
              pedido_item_id: row.dispatched_pedido_item_id,
              dispatched_quantity: row.dispatched_quantity,
              // Adjuntamos el objeto 'orderItem' completo, que incluye el nombre del producto.
              orderItem: orderItem,
            });
          }
        }
      }
    }

    return NextResponse.json(Array.from(deliveriesMap.values()));
  } catch (e) {
    console.error("[API_DELIVERIES_GET]", e);
    return new NextResponse("Error al obtener despachos", { status: 500 });
  }
}

// Acepta snake_case (front) o camelCase (compat)
const createDeliverySchema = z
  .object({
    order_id: z.number().int().positive().optional(),
    truck_id: z.number().int().positive().optional(),
    driver_id: z.number().int().positive().optional(),
    orderId: z.number().int().positive().optional(),
    truckId: z.number().int().positive().optional(),
    driverId: z.number().int().positive().optional(),
  })
  .refine(
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

    // 1. Insertar el despacho y obtener su información básica
    const insertAndSelectQuery = `
      DECLARE @new TABLE (id INT);
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status, created_at)
      OUTPUT INSERTED.id INTO @new(id)
      VALUES (@orderId, @truckId, @driverId, 'PENDIENTE', GETDATE());

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
        dr.phone                      AS driver_phone
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p          ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c      ON c.id = p.customer_id
      LEFT JOIN RIP.APP_CAMIONES t    ON t.id = d.truck_id
      LEFT JOIN RIP.APP_CHOFERES dr   ON dr.id = d.driver_id
      WHERE d.id = (SELECT TOP 1 id FROM @new);
    `;

    const deliveryRows = await executeQuery(insertAndSelectQuery, [
      { name: "orderId", type: TYPES.Int, value: orderId },
      { name: "truckId", type: TYPES.Int, value: truckId },
      { name: "driverId", type: TYPES.Int, value: driverId },
    ]);

    if (deliveryRows.length === 0) {
      throw new Error("No se pudo crear el despacho en la base de datos.");
    }
    const r = deliveryRows[0];

    // --- INICIO DE LA CORRECCIÓN ---

    // 2. Obtener los items del pedido por separado
    const itemsQuery = `
        SELECT
            oi.id                   AS pedido_item_id,
            oi.product_id           AS product_id,
            oi.quantity             AS cantidadSolicitada,
            oi.unit                 AS unit,
            oi.price_per_unit       AS price_per_unit,
            prod.name               AS product_name
        FROM RIP.APP_PEDIDOS_ITEMS oi
        JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = oi.product_id
        WHERE oi.order_id = @orderId
        ORDER BY oi.id ASC
    `;
    const itemRows = await executeQuery(itemsQuery, [
      { name: "orderId", type: TYPES.Int, value: orderId },
    ]);

    const orderItems: OrderItem[] = itemRows.map((itemRow) => ({
      id: itemRow.pedido_item_id,
      order_id: orderId,
      product_id: itemRow.product_id,
      quantity: itemRow.cantidadSolicitada,
      unit: itemRow.unit,
      price_per_unit: itemRow.price_per_unit,
      product: {
        id: itemRow.product_id,
        name: itemRow.product_name,
        unit: itemRow.unit,
      },
      dispatchItems: [],
    }));

    // 3. Construir el payload completo
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
        items: orderItems, // <--- Aquí incluimos los items
      },
      truck: { id: r.truck_id, placa: r.placa },
      driver: {
        id: r.driver_id,
        name: r.driver_name,
        phone: r.driver_phone ?? undefined,
      },
    };

    // --- FIN DE LA CORRECCIÓN ---

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
