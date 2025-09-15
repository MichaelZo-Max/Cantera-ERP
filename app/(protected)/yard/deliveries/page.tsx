import { executeQuery } from "@/lib/db";
import { AppLayout } from "@/components/app-layout";
import { YardDeliveriesClientUI } from "./yard-deliveries-client";
import { unstable_noStore as noStore } from "next/cache";
import type { Delivery, Order, Truck, Driver } from "@/lib/types";

// This server-side function fetches all necessary data at once.
async function getInitialData() {
  // Ensures we always get the freshest data from the database.
  noStore();
  
  // A single, comprehensive query to get all delivery-related information.
  const deliveriesQuery = `
    SELECT
        d.id, d.estado, d.notes, d.load_photo_url as loadPhoto,
        p.id as order_id, p.order_number as orderNumber,
        c.id as client_id, c.name as client_name,
        t.id as truck_id, t.placa,
        dr.id as driver_id, dr.name as driver_name, dr.phone as driver_phone,
        pi.id as pedido_item_id, 
        pi.quantity as cantidadSolicitada, 
        pi.unit,
        prod.id as product_id, 
        prod.name as product_name
    FROM RIP.APP_DESPACHOS d
    JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
    JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
    JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
    JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
    LEFT JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.order_id = p.id
    LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = pi.product_id
    ORDER BY d.created_at DESC;
  `;

  // Fetches active orders for the "Create Trip" dropdown.
  const activeOrdersQuery = `
    SELECT id, order_number as orderNumber, customer_id, c.name as client_name, status, created_at
    FROM RIP.APP_PEDIDOS p
    JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
    WHERE status IN ('PAID', 'PARTIALLY_DISPATCHED')
    ORDER BY created_at DESC;
  `;

  const trucksQuery = `SELECT id, placa FROM RIP.APP_CAMIONES WHERE is_active = 1;`;
  const driversQuery = `SELECT id, name FROM RIP.APP_CHOFERES WHERE is_active = 1;`;

  // Run all queries in parallel for efficiency.
  const [deliveriesResult, activeOrdersResult, trucksResult, driversResult] = await Promise.all([
    executeQuery(deliveriesQuery),
    executeQuery(activeOrdersQuery),
    executeQuery(trucksQuery),
    executeQuery(driversQuery),
  ]);
  
  // --- Data Processing and Shaping ---
  
  // Group all order items by their respective delivery ID.
  const deliveriesMap = new Map<string, Delivery>();
  for (const row of deliveriesResult) {
      if (!deliveriesMap.has(row.id)) {
          deliveriesMap.set(row.id, {
              id: row.id,
              estado: row.estado,
              notes: row.notes,
              loadPhoto: row.loadPhoto,
              order: {
                  id: row.order_id,
                  orderNumber: row.orderNumber,
                  // FIX: Client object now includes 'id'.
                  client: { id: row.client_id, name: row.client_name }, 
                  items: [], // Initialize items array.
              },
              // FIX: Truck object now includes 'id'.
              truck: { id: row.truck_id, placa: row.placa }, 
              driver: { id: row.driver_id, name: row.driver_name, phone: row.driver_phone },
          });
      }
      
      // FIX: Safely access the delivery from the map.
      const delivery = deliveriesMap.get(row.id)!; 
      if (row.pedido_item_id) {
          // FIX: The 'items' array is guaranteed to exist now.
          delivery.order.items.push({
              id: row.pedido_item_id,
              cantidadSolicitada: row.cantidadSolicitada,
              product: {
                  id: row.product_id,
                  name: row.product_name,
                  unit: row.unit
              }
          });
      }
  }

  const deliveries = Array.from(deliveriesMap.values());
  
  // FIX: Map active orders to the full 'Order' type, including missing properties.
  const activeOrders: Order[] = activeOrdersResult.map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer_id: o.customer_id,
    client: { id: o.customer_id, name: o.client_name },
    status: o.status,
    created_at: o.created_at,
    items: [], // Items are not needed for the dropdown, so an empty array is fine.
  }));

  return { deliveries, activeOrders, trucks: trucksResult, drivers: driversResult };
}

// The main server-rendered page component.
export default async function YardDeliveriesPage() {
  const { deliveries, activeOrders, trucks, drivers } = await getInitialData();

  return (
    <AppLayout title="Gestión de Patio">
      {/* Pass the fully-typed data down to the client component. */}
      <YardDeliveriesClientUI
        initialDeliveries={deliveries}
        initialActiveOrders={activeOrders}
        initialTrucks={trucks}
        initialDrivers={drivers}
      />
    </AppLayout>
  );
}