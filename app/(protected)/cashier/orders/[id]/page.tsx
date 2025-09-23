export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { OrderClient } from "./order-client";
import type { Client, Product, Destination, Truck, Driver, Order, Invoice } from "@/lib/types";
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

async function getOrderCatalogs() {
  try {
    const baseUrl = getApiUrl(""); // Usamos una cadena vacía para obtener solo la base
    const [cRes, pRes, dRes, tRes, drRes, iRes] = await Promise.all([
      fetch(`${baseUrl}api/customers?page=1&limit=20`),
      fetch(`${baseUrl}api/products?page=1&limit=20`),
      fetch(`${baseUrl}api/destinations`),
      fetch(`${baseUrl}api/trucks`),
      fetch(`${baseUrl}api/drivers`),
      fetch(`${baseUrl}api/invoices`, { next: { revalidate: 0 } }),
    ]);

    const clientsData = await cRes.json();
    const productsData = await pRes.json();
    
    return {
      clients: clientsData.data || [],
      products: productsData.data || [],
      destinations: await dRes.json(),
      trucks: await tRes.json(),
      drivers: await drRes.json(),
      invoices: await iRes.json(),
    };
  } catch (error) {
    console.error("Error cargando catálogos:", error);
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [], invoices: [] };
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

  // ✅ **CORRECCIÓN**:
  // 1. Se cambió `order.customer` por `order.client` para que coincida con tu tipo `Order`.
  // 2. Se añadieron los tipos explícitos `(c: Client)` y `(p: Product)` para solucionar los errores de 'any'.
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