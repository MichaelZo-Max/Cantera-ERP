// app/(protected)/cashier/orders/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { CashierOrderClientUI } from "./cashier-order-client"; 
// 👇 1. Importar el tipo Driver
import type { Client, Product, Truck as TruckType, Driver } from "@/lib/types";

// 👇 2. Actualizar la función para incluir los choferes
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  trucks: TruckType[];
  drivers: Driver[]; // <-- Se añade `drivers` al tipo de retorno
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    // Se añade la petición para los choferes (drivers)
    const [cRes, pRes, tRes, dRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, {
        next: { revalidate: 60, tags: ["customers"] },
      }),
      fetch(`${baseUrl}/api/products`, {
        next: { revalidate: 60, tags: ["products"] },
      }),
      fetch(`${baseUrl}/api/trucks`, {
        next: { revalidate: 60, tags: ["trucks"] },
      }),
      // <-- Se añade la nueva petición a la API de choferes
      fetch(`${baseUrl}/api/drivers`, {
        next: { revalidate: 60, tags: ["drivers"] },
      }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");
    if (!tRes.ok) throw new Error("Error al cargar camiones");
    if (!dRes.ok) throw new Error("Error al cargar choferes"); // <-- Se añade la validación

    const clients = await cRes.json();
    const products = await pRes.json();
    const trucks = await tRes.json();
    const drivers = await dRes.json(); // <-- Se procesa la respuesta de choferes

    return { clients, products, trucks, drivers }; // <-- Se devuelven los choferes
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devolvemos arrays vacíos para todos los catálogos en caso de error
    return { clients: [], products: [], trucks: [], drivers: [] };
  }
}


export default async function CashierOrderPage() {
  // 👇 3. Recibir y pasar los choferes al componente
  const { clients, products, trucks, drivers } = await getOrderCatalogs();

  return (
    <AppLayout title="Comanda y Pago">
      <CashierOrderClientUI
        initialClients={clients}
        initialProducts={products}
        initialTrucks={trucks}
        initialDrivers={drivers} // <-- Se pasan los choferes al componente hijo
      />
    </AppLayout>
  );
}