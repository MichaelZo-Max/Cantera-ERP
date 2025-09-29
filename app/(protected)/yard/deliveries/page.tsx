// app/(protected)/yard/deliveries/page.tsx

import { AppLayout } from "@/components/app-layout";
import { YardDeliveriesClientUI } from "./yard-deliveries-client";
import { unstable_noStore as noStore } from "next/cache";
import type { Delivery, Order } from "@/lib/types";
import { executeQuery } from "@/lib/db";

// Función auxiliar para mapear el estado de la base de datos a un estado conocido en la UI
const mapDbStatusToUi = (status: string): "PENDING" | "CARGADA" | "EXITED" => {
  if (!status) return "PENDING";
  const s = status.toUpperCase();
  if (s === "PENDIENTE" || s === "PENDING") return "PENDING";
  if (s === "CARGADA" || s === "LOADED") return "CARGADA";
  if (s === "SALIDA" || s === "SALIDA_OK" || s === "EXITED") return "EXITED";
  return "PENDING";
};

async function getData() {
  noStore(); // Asegura que los datos sean siempre frescos.

  // --- ✨ CONSULTA SQL OPTIMIZADA ---
  // Se reemplazan los JOIN a las vistas por JOINs directos a las tablas base
  // para aprovechar los nuevos índices y mejorar el rendimiento.
  const mainQuery = `
    -- CTE para calcular el total despachado por cada item de pedido a través de todos los viajes.
    WITH DispatchedTotals AS (
        SELECT
            pedido_item_id,
            SUM(dispatched_quantity) as total_dispatched
        FROM RIP.APP_DESPACHOS_ITEMS
        GROUP BY pedido_item_id
    )
    SELECT
        'DELIVERY' as type,
        d.id as id, d.status as estado, d.notes, d.load_photo_url as loadPhoto, d.exit_photo_url as exitPhoto,
        p.id as order_id, p.order_number, p.status as orderStatus, p.created_at as orderCreatedAt, p.customer_id,
        c.CODCLIENTE as client_id, c.NOMBRECLIENTE as client_name, -- ✅ CAMBIO: Tabla directa dbo.CLIENTES
        t.id as truck_id, t.placa,
        dr.id as driver_id, dr.name as driver_name, dr.phone as driver_phone,
        pi.id as pedido_item_id, pi.quantity as item_quantity, pi.unit as item_unit, pi.price_per_unit,
        prod.CODARTICULO as product_id, prod.DESCRIPCION as product_name, prod.UNIDADMEDIDA as product_unit, -- ✅ CAMBIO: Tabla directa dbo.ARTICULOS
        ISNULL(dt.total_dispatched, 0) as total_dispatched_quantity,
        NULL as order_only_id, NULL as order_only_number, NULL as order_only_customer_id, NULL as order_only_client_name, NULL as order_only_status, NULL as order_only_created_at,
        (SELECT pf.invoice_series, pf.invoice_number, pf.invoice_n, ISNULL(pf.invoice_series + '-' + CAST(pf.invoice_number AS VARCHAR) + pf.invoice_n COLLATE DATABASE_DEFAULT, '') AS invoice_full_number FROM RIP.APP_PEDIDOS_FACTURAS pf WHERE pf.pedido_id = p.id FOR JSON PATH) as invoices_json
    FROM RIP.APP_DESPACHOS d
    JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
    JOIN dbo.CLIENTES c ON c.CODCLIENTE = p.customer_id -- ✅ CAMBIO: JOIN a tabla directa
    JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
    JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
    LEFT JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.order_id = p.id
    LEFT JOIN dbo.ARTICULOS prod ON prod.CODARTICULO = pi.product_id -- ✅ CAMBIO: JOIN a tabla directa
    LEFT JOIN DispatchedTotals dt ON dt.pedido_item_id = pi.id

    UNION ALL

    SELECT
        'ACTIVE_ORDER' as type,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, -- 25 NULLs para coincidir
        p.id, p.order_number, p.customer_id, c.NOMBRECLIENTE, p.status, p.created_at, -- ✅ CAMBIO: Tabla directa dbo.CLIENTES
        (SELECT pf.invoice_series, pf.invoice_number, pf.invoice_n, ISNULL(pf.invoice_series + '-' + CAST(pf.invoice_number AS VARCHAR) + pf.invoice_n COLLATE DATABASE_DEFAULT, '') AS invoice_full_number FROM RIP.APP_PEDIDOS_FACTURAS pf WHERE pf.pedido_id = p.id FOR JSON PATH) as invoices_json
    FROM RIP.APP_PEDIDOS p
    JOIN dbo.CLIENTES c ON c.CODCLIENTE = p.customer_id -- ✅ CAMBIO: JOIN a tabla directa
    WHERE p.status IN ('INVOICED', 'PARTIALLY_DISPATCHED');
  `;

  const results = await executeQuery(mainQuery);

  // Procesamiento de los resultados para construir los objetos (sin cambios aquí)
  const deliveriesMap = new Map<number, Delivery>();
  const activeOrders: Order[] = [];

  for (const row of results) {
    const invoices = row.invoices_json ? JSON.parse(row.invoices_json) : [];

    switch (row.type) {
      case "DELIVERY":
        if (!deliveriesMap.has(row.id)) {
          deliveriesMap.set(row.id, {
            id: row.id,
            estado: mapDbStatusToUi(row.estado),
            notes: row.notes || undefined,
            loadPhoto: row.loadPhoto || undefined,
            exitPhoto: row.exitPhoto || undefined,
            orderDetails: {
              id: row.order_id,
              order_number: row.order_number,
              customer_id: row.customer_id,
              status: row.orderStatus,
              created_at: row.orderCreatedAt,
              client: { id: row.client_id, name: row.client_name },
              items: [],
              invoices: invoices,
            },
            truck: { id: row.truck_id, placa: row.placa },
            driver: {
              id: row.driver_id,
              name: row.driver_name,
              phone: row.driver_phone || undefined,
            },
          });
        }
        const delivery = deliveriesMap.get(row.id)!;
        const itemExists = delivery.orderDetails.items.some(
          (item) => item.id === row.pedido_item_id
        );
        if (row.pedido_item_id && !itemExists) {
          delivery.orderDetails.items.push({
            id: row.pedido_item_id,
            order_id: row.order_id,
            product_id: row.product_id,
            quantity: row.item_quantity,
            totalDispatched: row.total_dispatched_quantity,
            unit: row.item_unit,
            price_per_unit: row.price_per_unit,
            product: {
              id: row.product_id,
              name: row.product_name,
              unit: row.product_unit,
            },
          });
        }
        break;
      case "ACTIVE_ORDER":
        activeOrders.push({
          id: row.order_only_id,
          order_number: row.order_only_number,
          customer_id: row.order_only_customer_id,
          client: {
            id: row.order_only_customer_id,
            name: row.order_only_client_name,
          },
          status: row.order_only_status,
          created_at: row.order_only_created_at,
          items: [],
          invoices: invoices,
        });
        break;
    }
  }

  activeOrders.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    deliveries: Array.from(deliveriesMap.values()).sort((a, b) => b.id - a.id),
    activeOrders,
  };
}

export default async function YardDeliveriesPage() {
  try {
    const { deliveries, activeOrders } = await getData();

    return (
      <AppLayout title="Gestión de Patio">
        <YardDeliveriesClientUI
          initialDeliveries={deliveries}
          initialActiveOrders={activeOrders}
        />
      </AppLayout>
    );
  } catch (error) {
    console.error("Failed to fetch page data:", error);
    return (
      <AppLayout title="Error">
        <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold mb-2">Error al Cargar Datos</h2>
          <p>
            No se pudieron cargar los datos de la página. Por favor, intente de
            nuevo más tarde.
          </p>
          <pre className="mt-4 text-xs bg-gray-100 p-2 rounded text-black font-mono">
            {error instanceof Error
              ? error.message
              : "Ocurrió un error desconocido"}
          </pre>
        </div>
      </AppLayout>
    );
  }
}
