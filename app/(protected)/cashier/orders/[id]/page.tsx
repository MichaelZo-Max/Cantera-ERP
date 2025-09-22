// app/(protected)/cashier/orders/[id]/page.tsx
export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import { OrderClient } from "./order-client"; 
// Añadimos Invoice a la importación de tipos
import type { Client, Product, Destination, Truck, Driver, Order, Invoice } from "@/lib/types";

// Función para obtener los datos de una orden específica
async function getOrderDetails(orderId: string): Promise<Order | null> {
  if (orderId === "new") return null; 
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/api/orders/${orderId}`, { cache: 'no-store' }); // Evitar cache para datos de edición
    if (!res.ok) throw new Error("Error al cargar la orden");
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Función para obtener todos los catálogos necesarios para el formulario
async function getOrderCatalogs() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // Añadimos la llamada a la API de facturas
    const [cRes, pRes, dRes, tRes, drRes, iRes] = await Promise.all([
      fetch(`${baseUrl}/api/customers`, { next: { tags: ["customers"] } }),
      fetch(`${baseUrl}/api/products`, { next: { tags: ["products"] } }),
      fetch(`${baseUrl}/api/destinations`, { next: { tags: ["destinations"] } }),
      fetch(`${baseUrl}/api/trucks`, { next: { tags: ["trucks"] } }),
      fetch(`${baseUrl}/api/drivers`, { next: { tags: ["drivers"] } }),
      fetch(`${baseUrl}/api/invoices`, { next: { revalidate: 0 } }), // No cachear facturas
    ]);

    const clients = await cRes.json();
    const products = await pRes.json();
    const destinations = await dRes.json();
    const trucks = await tRes.json();
    const drivers = await drRes.json();
    const invoices = await iRes.json(); // Obtenemos las facturas

    return { clients, products, destinations, trucks, drivers, invoices };
  } catch (error) {
    console.error("Error cargando catálogos:", error);
    return { clients: [], products: [], destinations: [], trucks: [], drivers: [], invoices: [] };
  }
}

// El componente de página que renderiza el formulario
export default async function OrderPage({ params }: { params: { id: string } }) {
  const isEditing = params.id !== "new";
  const [order, catalogs] = await Promise.all([
    getOrderDetails(params.id),
    getOrderCatalogs(),
  ]);

  // Si estamos editando pero la orden no se encontró (y no es el pedido que se acaba de crear)
  if (isEditing && !order) {
    return (
      <AppLayout title="Error">
        <p className="text-center">No se pudo encontrar la orden solicitada.</p>
      </AppLayout>
    );
  }

  const pageTitle = isEditing ? `Editar Pedido #${order?.order_number}` : "Crear Nuevo Pedido";

  return (
    <AppLayout title={pageTitle}>
      <OrderClient
        isEditing={isEditing}
        initialOrderData={order}
        catalogs={catalogs}
      />
    </AppLayout>
  );
}