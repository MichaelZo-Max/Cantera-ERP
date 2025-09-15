import { AppLayout } from "@/components/app-layout";
import { YardDeliveriesClientUI } from "./yard-deliveries-client";
import { unstable_noStore as noStore } from "next/cache";
import type { Order, Truck, Driver } from "@/lib/types";
import { executeQuery } from "@/lib/db";

async function getSupportingData() {
  noStore();
  
  // LA CORRECCIÓN ESTÁ EN LA SIGUIENTE CONSULTA
  const activeOrdersQuery = `
    SELECT 
      p.id, -- Se especifica p.id para evitar la ambigüedad
      p.order_number, 
      p.customer_id, 
      c.name as client_name, 
      p.status, 
      p.created_at
    FROM RIP.APP_PEDIDOS p
    JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
    WHERE p.status IN ('PAID', 'PARTIALLY_DISPATCHED')
    ORDER BY p.created_at DESC;
  `;
  const trucksQuery = `SELECT id, placa FROM RIP.APP_CAMIONES WHERE is_active = 1;`;
  const driversQuery = `SELECT id, name FROM RIP.APP_CHOFERES WHERE is_active = 1;`;

  const [activeOrdersResult, trucksResult, driversResult] = await Promise.all([
    executeQuery(activeOrdersQuery),
    executeQuery(trucksQuery),
    executeQuery(driversQuery),
  ]);

  const activeOrders: Order[] = activeOrdersResult.map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    customer_id: o.customer_id,
    client: { id: o.customer_id, name: o.client_name },
    status: o.status,
    created_at: o.created_at,
    items: [], 
  }));

  return { activeOrders, trucks: trucksResult as Truck[], drivers: driversResult as Driver[] };
}

export default async function YardDeliveriesPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const deliveriesResponse = await fetch(`${apiUrl}/api/deliveries`, { cache: 'no-store' });
  if (!deliveriesResponse.ok) {
    console.error("Failed to fetch deliveries:", await deliveriesResponse.text());
    return (
      <AppLayout title="Error">
        <p>No se pudieron cargar los datos de despachos.</p>
      </AppLayout>
    );
  }
  const deliveries = await deliveriesResponse.json();
  
  const { activeOrders, trucks, drivers } = await getSupportingData();

  return (
    <AppLayout title="Gestión de Patio">
      <YardDeliveriesClientUI
        initialDeliveries={deliveries}
        initialActiveOrders={activeOrders}
        initialTrucks={trucks}
        initialDrivers={drivers}
      />
    </AppLayout>
  );
}