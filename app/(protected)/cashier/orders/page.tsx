// app/(protected)/cashier/orders/page.tsx (Corregido)

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { CashierOrderClientUI } from "./cashier-order-client";
// 👇 1. Se eliminan los imports de Truck y Driver que ya no se usan aquí
import type { Client, Product } from "@/lib/types";

// 👇 2. Se simplifica la función para que solo obtenga clientes y productos
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    // Se eliminan las peticiones para trucks y drivers
    const [cRes, pRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, {
        next: { revalidate: 60, tags: ["customers"] },
      }),
      fetch(`${baseUrl}/api/products`, {
        next: { revalidate: 60, tags: ["products"] },
      }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");

    const clients = await cRes.json();
    const products = await pRes.json();

    return { clients, products };
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devolvemos arrays vacíos en caso de error
    return { clients: [], products: [] };
  }
}

export default async function CashierOrderPage() {
  // 👇 3. Se obtienen solo los datos necesarios
  const { clients, products } = await getOrderCatalogs();

  return (
    <AppLayout title="Crear Pedido">
      {/* 👇 4. Se pasan solo las props que el componente necesita */}
      <CashierOrderClientUI
        initialClients={clients}
        initialProducts={products}
      />
    </AppLayout>
  );
}