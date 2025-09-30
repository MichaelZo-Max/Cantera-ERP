export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/page-header";
import { executeQuery } from "@/lib/db";
import { CashierOrdersClient } from "./cashier-orders-client";
import type { CashierOrder } from "@/lib/types";
import { AppLayout } from "@/components/app-layout";

async function getCashierOrders(): Promise<CashierOrder[]> {
  try {
    const query = `
      SELECT 
        c.id, 
        c.order_number, 
        c.total_usd, 
        c.status, 
        c.created_at,
        c.related_order_id,
        cl.NOMBRECLIENTE as customer_name, 
        c.customer_id,
        u.name as created_by_name,
        (
          SELECT 
            d.id, 
            d.product_id, 
            d.product_name, 
            d.quantity, 
            d.price_per_unit_usd as price_usd,
            d.subtotal_usd as total_usd
          FROM RIP.APP_ORDENES_SIN_FACTURA_ITEMS d
          WHERE d.order_cab_id = c.id
          FOR JSON PATH
        ) as details
      FROM RIP.APP_ORDENES_SIN_FACTURA_CAB c
      JOIN dbo.CLIENTES cl ON c.customer_id = cl.CODCLIENTE
      JOIN RIP.APP_USUARIOS u ON c.created_by = u.id
      ORDER BY c.id DESC
    `;
    const orders = await executeQuery(query);
    
    return orders.map(order => ({
      ...order,
      details: order.details ? JSON.parse(order.details) : [],
    })) as CashierOrder[];

  } catch (error) {
    console.error("Error fetching cashier orders:", error);
    return [];
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
