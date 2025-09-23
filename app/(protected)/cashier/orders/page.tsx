export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { OrderFormClient } from "./order-form-client";
import type { Client, Product, Destination, Truck, Driver, Invoice } from "@/lib/types";
import { getApiUrl } from "@/lib/utils";

// La función ahora pide solo la primera página de clientes y productos
async function getOrderCatalogs(): Promise<{
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
  invoices: Invoice[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // Añadimos la nueva llamada a la API de facturas
    const [cRes, pRes, dRes, tRes, drRes, iRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers?page=1&limit=20`, { next: { tags: ["customers"] } }),
      fetch(`${baseUrl}/api/products?page=1&limit=20`, { next: { tags: ["products"] } }),
      fetch(`${baseUrl}/api/destinations`, { next: { tags: ["destinations"] } }),
      fetch(`${baseUrl}/api/trucks`, { next: { tags: ["trucks"] } }),
      fetch(`${baseUrl}/api/drivers`, { next: { tags: ["drivers"] } }),
      fetch(`${baseUrl}/api/invoices`, { next: { revalidate: 0 } }),
    ]);

    // Procesamos todas las respuestas
    const clientsData = await cRes.json();
    const productsData = await pRes.json();
    const destinations = await dRes.json();
    const trucks = await tRes.json();
    const drivers = await drRes.json();
    const invoices = await iRes.json();
    
    // Extraemos el array 'data' de las respuestas paginadas
    const clients = clientsData.data || [];
    const products = productsData.data || [];

    return { clients, products, destinations, trucks, drivers, invoices };
  } catch (error) {
    console.error("Error cargando catálogos en el servidor:", error);
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [], invoices: [] };
  }
}

export default async function CashierOrderPage() {
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
            invoices={invoices}
          />
        </div>
      </div>
    </AppLayout>
  );
}