export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { CashierOrderClientUI } from "./cashier-order-client";
// 👇 1. Importa el tipo 'Destination'
import type { Client, Product, Destination } from "@/lib/types";

// 👇 2. Actualiza la función para que también obtenga los destinos
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  destinations: Destination[]; // Añade los destinos al tipo de retorno
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    // Añade la petición para obtener los destinos
    const [cRes, pRes, dRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, {
        next: { revalidate: 60, tags: ["customers"] },
      }),
      fetch(`${baseUrl}/api/products`, {
        next: { revalidate: 60, tags: ["products"] },
      }),
      fetch(`${baseUrl}/api/destinations`, { // Nueva petición
        next: { revalidate: 60, tags: ["destinations"] },
      }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");
    if (!dRes.ok) throw new Error("Error al cargar destinos");

    const clients = await cRes.json();
    const products = await pRes.json();
    const destinations = await dRes.json();

    return { clients, products, destinations }; // Devuelve los destinos
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devuelve arrays vacíos en caso de error
    return { clients: [], products: [], destinations: [] };
  }
}

export default async function CashierOrderPage() {
  // 👇 3. Obtén los destinos junto con los otros catálogos
  const { clients, products, destinations } = await getOrderCatalogs();

  return (
    <AppLayout title="Crear Pedido">
      {/* 👇 4. Pasa la prop 'initialDestinations' al componente cliente */}
      <CashierOrderClientUI
        initialClients={clients}
        initialProducts={products}
        initialDestinations={destinations}
      />
    </AppLayout>
  );
}