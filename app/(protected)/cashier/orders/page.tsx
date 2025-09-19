export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { CashierOrderClientUI } from "./cashier-order-client";
// 👇 1. Importa los tipos 'Truck' y 'Driver'
import type { Client, Product, Destination, Truck, Driver } from "@/lib/types";

// 👇 2. Actualiza la función para que también obtenga camiones y choferes
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[]; // Añade los camiones al tipo de retorno
  drivers: Driver[]; // Añade los choferes al tipo de retorno
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    // 👇 3. Añade las peticiones para obtener camiones y choferes
    const [cRes, pRes, dRes, tRes, drRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, {
        next: { revalidate: 60, tags: ["customers"] },
      }),
      fetch(`${baseUrl}/api/products`, {
        next: { revalidate: 60, tags: ["products"] },
      }),
      fetch(`${baseUrl}/api/destinations`, {
        next: { revalidate: 60, tags: ["destinations"] },
      }),
      fetch(`${baseUrl}/api/trucks`, { // Nueva petición para camiones
        next: { revalidate: 60, tags: ["trucks"] },
      }),
      fetch(`${baseUrl}/api/drivers`, { // Nueva petición para choferes
        next: { revalidate: 60, tags: ["drivers"] },
      }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");
    if (!dRes.ok) throw new Error("Error al cargar destinos");
    if (!tRes.ok) throw new Error("Error al cargar camiones");
    if (!drRes.ok) throw new Error("Error al cargar choferes");


    const clients = await cRes.json();
    const products = await pRes.json();
    const destinations = await dRes.json();
    const trucks = await tRes.json();
    const drivers = await drRes.json();

    // 👇 4. Devuelve los nuevos catálogos
    return { clients, products, destinations, trucks, drivers };
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devuelve arrays vacíos en caso de error
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [] };
  }
}

export default async function CashierOrderPage() {
  // 👇 5. Obtén los camiones y choferes junto con los otros catálogos
  const { clients, products, destinations, trucks, drivers } = await getOrderCatalogs();

  return (
    <AppLayout title="Crear Pedido">
      {/* 👇 6. Pasa las nuevas props 'initialTrucks' e 'initialDrivers' al componente cliente */}
      <CashierOrderClientUI
        initialClients={clients}
        initialProducts={products}
        initialDestinations={destinations}
        initialTrucks={trucks}
        initialDrivers={drivers}
      />
    </AppLayout>
  );
}

