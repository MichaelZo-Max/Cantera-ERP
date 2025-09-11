// app/(protected)/cashier/orders/list/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import type { Order } from "@/lib/types";
import { OrdersListClientUI } from "./orders-list-client"; // Importamos el nuevo componente

// Función para cargar los datos en el servidor
async function getOrders(): Promise<{ orders: Order[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/orders`, {
      next: {
        revalidate: 60, // Revalida la caché cada 60 segundos
        tags: ["orders"], // Etiqueta para invalidar al crear/actualizar
      },
    });

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
