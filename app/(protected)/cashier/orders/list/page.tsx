// app/(protected)/cashier/orders/list/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Order } from "@/lib/types";
import { OrdersListClientUI } from "./orders-list-client"; // Importamos el nuevo componente

// Función para cargar los datos en el servidor
async function getOrders(): Promise<{ orders: Order[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/orders`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al cargar las órdenes");

    const orders = await res.json();
    return { orders };
  } catch (error) {
    console.error("Error cargando órdenes en el servidor:", error);
    return { orders: [] };
  }
}

// Esta página ahora es un Server Component
export default async function OrdersListPage() {
  const { orders } = await getOrders();

  return (
    <AppLayout title="Lista de Pedidos">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <OrdersListClientUI initialOrders={orders} />
    </AppLayout>
  );
}