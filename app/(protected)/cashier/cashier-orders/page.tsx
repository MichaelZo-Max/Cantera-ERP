// app/(protected)/cashier/cashier-orders/page.tsx

import { PageHeader } from "@/components/page-header";
import { executeQuery } from "@/lib/db";
import { CashierOrdersClient } from "./cashier-orders-client";
import { CashierOrder } from "@/lib/types";
import { AppLayout } from "@/components/app-layout";

// Función para obtener los datos directamente de la BD
async function getCashierOrders(): Promise<CashierOrder[]> {
  try {
    const query = `
      SELECT 
        c.id, c.order_number, c.total_usd, c.status, c.created_at,
        cl.NOMBRECLIENTE as customer_name,
        u.name as created_by_name
      FROM RIP.APP_ORDENES_SIN_FACTURA_CAB c
      JOIN dbo.CLIENTES cl ON c.customer_id = cl.CODCLIENTE
      JOIN RIP.APP_USUARIOS u ON c.created_by = u.id
      ORDER BY c.id DESC
    `;
    const orders = await executeQuery(query);
    return orders as CashierOrder[];
  } catch (error) {
    console.error("Error fetching cashier orders:", error);
    return []; // Devolver array vacío en caso de error
  }
}

export default async function CashierOrdersPage() {
  const orders = await getCashierOrders();

  return (
    <AppLayout title="Órdenes de Caja">
        <PageHeader
            title="Órdenes de Caja"
            description="Consulta el historial de ventas directas creadas sin factura previa."
        />
        <CashierOrdersClient data={orders} />
    </AppLayout>
  );
}