export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { OrderClient } from "./order-client";
// Quitamos 'Invoice' de aquí, ya no se carga en esta página
import type { Client, Product, Destination, Truck, Driver, Order } from "@/lib/types";
import { getApiUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

async function getOrderDetails(orderId: string): Promise<Order | null> {
  if (!orderId) return null;
  try {
    const res = await fetch(getApiUrl(`/api/orders/${orderId}`), { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Error al cargar la orden");
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// La función ahora solo obtiene los catálogos esenciales, sin las facturas.
async function getOrderCatalogs() {
  try {
    const baseUrl = getApiUrl("");
    // Eliminamos iRes (la llamada a /api/invoices) de Promise.all
    const [cRes, pRes, dRes, tRes, drRes] = await Promise.all([
      fetch(`${baseUrl}api/customers?page=1&limit=20`),
      fetch(`${baseUrl}api/products?page=1&limit=20`),
      fetch(`${baseUrl}api/destinations`),
      fetch(`${baseUrl}api/trucks`),
      fetch(`${baseUrl}api/drivers`),
    ]);

    const clientsData = await cRes.json();
    const productsData = await pRes.json();
    
    // El objeto retornado ya no incluye la propiedad 'invoices'
    return {
      clients: clientsData.data || [],
      products: productsData.data || [],
      destinations: await dRes.json(),
      trucks: await tRes.json(),
      drivers: await drRes.json(),
    };
  } catch (error) {
    console.error("Error cargando catálogos:", error);
    // Ajustamos el objeto de retorno en caso de error
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [] };
  }
}

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const [order, catalogs] = await Promise.all([
    getOrderDetails(params.id),
    getOrderCatalogs(),
  ]);

  if (!order) {
    notFound();
  }

  if (order.client && !catalogs.clients.some((c: Client) => c.id === order.customer_id)) {
    catalogs.clients.unshift(order.client);
  }
  order.items?.forEach(item => {
    if (item.product && !catalogs.products.some((p: Product) => p.id === item.product_id)) {
      catalogs.products.unshift(item.product);
    }
  });

  return (
    <AppLayout title={`Editar Pedido #${order.order_number}`}>
      <div className="space-y-6">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Editar Pedido <span className="text-primary">#{order.order_number}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Modifica los detalles del pedido.
          </p>
        </div>
        <OrderClient
          orderData={order}
          catalogs={catalogs}
        />
      </div>
    </AppLayout>
  );
}
