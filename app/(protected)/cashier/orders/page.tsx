// app/(protected)/cashier/orders/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { CashierOrderClientUI } from "./cashier-order-client"; // Importamos el nuevo componente de cliente
import type { Client, Product, Truck as TruckType } from "@/lib/types";

// Función para cargar los datos necesarios en el servidor
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  trucks: TruckType[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const [cRes, pRes, tRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, {
        next: {
          revalidate: 60,
          tags: ["customers"],
        },
      }),
      fetch(`${baseUrl}/api/products`, {
        next: {
          revalidate: 60,
          tags: ["products"],
        },
      }),
      fetch(`${baseUrl}/api/trucks`, {
        next: {
          revalidate: 60,
          tags: ["trucks"],
        },
      }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");
    if (!tRes.ok) throw new Error("Error al cargar camiones");

    const clients = await cRes.json();
    const products = await pRes.json();
    const trucks = await tRes.json();

    return { clients, products, trucks };
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devolvemos arrays vacíos si hay un error para que la página no se rompa
    return { clients: [], products: [], trucks: [] };
  }
}

// Esta página ahora es un Server Component (sin "use client")
export default async function CashierOrderPage() {
  const { clients, products, trucks } = await getOrderCatalogs();

  return (
    <AppLayout title="Comanda y Pago">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <CashierOrderClientUI
        initialClients={clients}
        initialProducts={products}
        initialTrucks={trucks}
      />
    </AppLayout>
  );
}
