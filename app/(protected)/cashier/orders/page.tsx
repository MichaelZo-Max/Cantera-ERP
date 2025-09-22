// app/(protected)/cashier/orders/page.tsx
export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { OrderFormClient } from "./order-form-client";
// Asegúrate de que tu archivo de tipos exporte 'Invoice'
import type { Client, Product, Destination, Truck, Driver, Invoice } from "@/lib/types";

// La función para obtener los catálogos ahora también busca las facturas
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
  invoices: Invoice[]; // <-- Añadido
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // Añadimos la nueva llamada a la API de facturas
    const [cRes, pRes, dRes, tRes, drRes, iRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, { next: { revalidate: 60, tags: ["customers"] } }),
      fetch(`${baseUrl}/api/products`, { next: { revalidate: 60, tags: ["products"] } }),
      fetch(`${baseUrl}/api/destinations`, { next: { revalidate: 60, tags: ["destinations"] } }),
      fetch(`${baseUrl}/api/trucks`, { next: { revalidate: 60, tags: ["trucks"] } }),
      fetch(`${baseUrl}/api/drivers`, { next: { revalidate: 60, tags: ["drivers"] } }),
      fetch(`${baseUrl}/api/invoices`, { cache: 'no-store' }),
    ]);

    if (!cRes.ok) throw new Error("Error al cargar clientes");
    if (!pRes.ok) throw new Error("Error al cargar productos");
    if (!dRes.ok) throw new Error("Error al cargar destinos");
    if (!tRes.ok) throw new Error("Error al cargar camiones");
    if (!drRes.ok) throw new Error("Error al cargar choferes");
    if (!iRes.ok) throw new Error("Error al cargar facturas"); // <-- Verificación

    const clients = await cRes.json();
    const products = await pRes.json();
    const destinations = await dRes.json();
    const trucks = await tRes.json();
    const drivers = await drRes.json();
    const invoices = await iRes.json(); // <-- Obtenemos las facturas

    return { clients, products, destinations, trucks, drivers, invoices };
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    // Devolvemos el array vacío para facturas también
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [], invoices: [] };
  }
}

// El componente de la página ahora usa el OrderFormClient
export default async function CashierOrderPage() {
  // Desestructuramos las facturas
  const { clients, products, destinations, trucks, drivers, invoices } = await getOrderCatalogs();

  return (
    <AppLayout title="Crear Pedido">
      <div className="space-y-6">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Crear Nuevo Pedido
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Completa los siguientes campos para registrar un nuevo pedido para un cliente.
          </p>
        </div>
        
        <div>
          <OrderFormClient
            clients={clients}
            products={products}
            destinations={destinations}
            trucks={trucks}
            drivers={drivers}
            invoices={invoices} // <-- Pasamos las facturas al componente cliente
          />
        </div>
      </div>
    </AppLayout>
  );
}