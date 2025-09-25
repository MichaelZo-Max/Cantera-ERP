// app/api/deliveries/route.ts

import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { Delivery, OrderItem, Invoice } from "@/lib/types";
import { createDeliverySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// --- Helpers (sin cambios) ---
function mapDbStatusToUi(status: string): "PENDING" | "CARGADA" | "EXITED" {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
}

// ======================= GET /api/deliveries (OPTIMIZADO) =======================
export async function GET(_request: Request) {
  try {
    // ✅ CONSULTA OPTIMIZADA: Se usan JOINs a tablas directas.
    const listQuery = `
      SELECT
          d.id, d.status AS estado, d.notes, d.load_photo_url AS loadPhoto, d.exit_photo_url AS exitPhoto,
          p.id AS order_id, p.order_number, p.customer_id, p.status AS order_status, p.created_at AS order_created_at,
          c.CODCLIENTE AS client_id, c.NOMBRECLIENTE AS client_name, -- ✅ CAMBIO
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
      JOIN dbo.CLIENTES c           ON c.CODCLIENTE = p.customer_id -- ✅ CAMBIO
      JOIN RIP.APP_CAMIONES t       ON t.id = d.truck_id
      JOIN RIP.APP_CHOFERES dr      ON dr.id = d.driver_id
      ORDER BY d.id DESC;
    `;
    const deliveryRows = await executeQuery(listQuery, []);
    
    const orderItemsCache = new Map<number, OrderItem[]>();
    const deliveries: Delivery[] = [];

    for (const row of deliveryRows) {
      const orderId = row.order_id;
      const deliveryId = row.id;

      // ✅ CONSULTA OPTIMIZADA para items de despacho
      const dispatchItemsQuery = `
        SELECT
          di.id, di.dispatched_quantity, di.pedido_item_id,
          oi.product_id, oi.quantity, oi.price_per_unit, oi.unit, oi.order_id,
          prod.DESCRIPCION as product_name -- ✅ CAMBIO
        FROM RIP.APP_DESPACHOS_ITEMS di
        JOIN RIP.APP_PEDIDOS_ITEMS oi ON oi.id = di.pedido_item_id
        JOIN dbo.ARTICULOS prod ON prod.CODARTICULO = oi.product_id -- ✅ CAMBIO
        WHERE di.despacho_id = @delivery_id;
      `;
      const dispatchItemRows = await executeQuery(dispatchItemsQuery, [{ name: "delivery_id", type: TYPES.Int, value: deliveryId }]);
      
      const dispatchItems = dispatchItemRows.map((item: any) => ({
        id: item.id,
        despacho_id: deliveryId,
        pedido_item_id: item.pedido_item_id,
        dispatched_quantity: item.dispatched_quantity,
        orderItem: {
          id: item.pedido_item_id,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          unit: item.unit,
          product: {
            id: item.product_id,
            name: item.product_name,
            unit: item.unit,
          },
        },
      }));
      
      if (!orderItemsCache.has(orderId)) {
        // ✅ CONSULTA OPTIMIZADA para items de pedido
        const itemsQuery = `
            SELECT
                oi.id, oi.product_id, oi.quantity, oi.unit, oi.price_per_unit,
                prod.DESCRIPCION AS product_name -- ✅ CAMBIO
            FROM RIP.APP_PEDIDOS_ITEMS oi
            JOIN dbo.ARTICULOS prod ON prod.CODARTICULO = oi.product_id -- ✅ CAMBIO
            WHERE oi.order_id = @order_id
            ORDER BY oi.id ASC;
        `;
        const itemRows = await executeQuery(itemsQuery, [{ name: "order_id", type: TYPES.Int, value: orderId }]);
        
        const items = itemRows.map((item: any) => ({
          id: item.id,
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          price_per_unit: item.price_per_unit,
          product: { id: item.product_id, name: item.product_name, unit: item.unit },
          dispatchItems: [],
        }));
        orderItemsCache.set(orderId, items);
      }

      const orderItems = orderItemsCache.get(orderId) || [];
      const invoices = row.order_invoices_json ? JSON.parse(row.order_invoices_json) : [];

      deliveries.push({
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
        dispatchItems: dispatchItems,
      });
    }

    return NextResponse.json(deliveries);
  } catch (e) {
    console.error("[API_DELIVERIES_GET]", e);
    return new NextResponse("Error al obtener despachos", { status: 500 });
  }
}

// ======================= POST /api/deliveries (OPTIMIZADO) =======================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDeliverySchema.parse(body);
    const { order_id, truck_id, driver_id } = parsed;

    const insertQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status)
      OUTPUT INSERTED.id
      VALUES (@order_id, @truck_id, @driver_id, 'PENDIENTE');
    `;
    const insertResult = await executeQuery(insertQuery, [
      { name: "order_id", type: TYPES.Int, value: order_id },
      { name: "truck_id", type: TYPES.Int, value: truck_id },
      { name: "driver_id", type: TYPES.Int, value: driver_id },
    ]);

    if (!insertResult || insertResult.length === 0) {
      throw new Error("No se pudo crear el despacho en la base de datos.");
    }
    const newDeliveryId = insertResult[0].id;

    // ✅ CONSULTA OPTIMIZADA
    const selectQuery = `
      SELECT
        d.id, d.status AS estado, d.notes, d.load_photo_url AS loadPhoto, d.exit_photo_url AS exitPhoto,
        p.id AS order_id, p.order_number, p.customer_id, p.status AS order_status, p.created_at AS order_created_at,
        c.CODCLIENTE AS client_id, c.NOMBRECLIENTE AS client_name, -- ✅ CAMBIO
        t.id AS truck_id, t.placa,
        dr.id AS driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
        (
            SELECT pf.invoice_series, pf.invoice_number, pf.invoice_n, 
                   ISNULL(pf.invoice_series + '-' + CAST(pf.invoice_number AS VARCHAR) + pf.invoice_n COLLATE DATABASE_DEFAULT, '') AS invoice_full_number
            FROM RIP.APP_PEDIDOS_FACTURAS pf
            WHERE pf.pedido_id = p.id
            FOR JSON PATH
        ) AS order_invoices_json
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
      JOIN dbo.CLIENTES c ON c.CODCLIENTE = p.customer_id -- ✅ CAMBIO
      LEFT JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
      LEFT JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
      WHERE d.id = @delivery_id;
    `;
    const deliveryRows = await executeQuery(selectQuery, [
      { name: "delivery_id", type: TYPES.Int, value: newDeliveryId },
    ]);
    
    if (deliveryRows.length === 0) {
      throw new Error("No se pudo recuperar el despacho recién creado.");
    }
    const r = deliveryRows[0];
    const invoices = r.order_invoices_json ? JSON.parse(r.order_invoices_json) : [];

    // ✅ CONSULTA OPTIMIZADA
    const itemsQuery = `
      SELECT
        oi.id, oi.product_id, oi.quantity, oi.unit, oi.price_per_unit,
        prod.DESCRIPCION AS product_name -- ✅ CAMBIO
      FROM RIP.APP_PEDIDOS_ITEMS oi
      JOIN dbo.ARTICULOS prod ON prod.CODARTICULO = oi.product_id -- ✅ CAMBIO
      WHERE oi.order_id = @order_id
      ORDER BY oi.id ASC;
    `;
    const itemRows = await executeQuery(itemsQuery, [
      { name: "order_id", type: TYPES.Int, value: r.order_id }, 
    ]);

    const orderItems: OrderItem[] = itemRows.map((itemRow) => ({
      id: itemRow.id,
      order_id: r.order_id,
      product_id: itemRow.product_id,
      quantity: itemRow.quantity,
      unit: itemRow.unit,
      price_per_unit: itemRow.price_per_unit,
      product: {
        id: itemRow.product_id,
        name: itemRow.product_name,
        unit: itemRow.unit,
      },
      dispatchItems: [],
    }));
    
    const payload: Delivery = {
      id: r.id,
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
        items: orderItems,
        invoices: invoices,
      },
      truck: { id: r.truck_id, placa: r.placa },
      driver: {
        id: r.driver_id,
        name: r.driver_name,
        phone: r.driver_phone ?? undefined,
      },
      dispatchItems: []
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