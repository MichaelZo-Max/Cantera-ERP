// app/(protected)/cashier/deliveries/page.tsx

export const dynamic = 'force-dynamic'

import { AppLayout } from "@/components/app-layout";
import type { Delivery } from "@/lib/types";
import { CashierDeliveriesClientUI } from "./deliveries-client"; // Importamos el nuevo componente

async function getDeliveries(): Promise<{ deliveries: Delivery[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/deliveries`, {
      next: {
        revalidate: 60, // Revalida en segundo plano cada 60 segundos
        tags: ["deliveries"], // Etiqueta para la invalidación de despachos
      },
    });

    if (!res.ok) {
      throw new Error("Error al cargar los despachos");
    }

    const deliveries = await res.json();
    return { deliveries };
  } catch (error) {
    console.error("Error cargando despachos en el servidor:", error);
    return { deliveries: [] };
  }
}

// Esta página ahora es un Server Component
export default async function CashierDeliveriesPage() {
  const { deliveries } = await getDeliveries();

  return (
    <AppLayout title="Seguimiento de Despachos">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <CashierDeliveriesClientUI initialDeliveries={deliveries} />
    </AppLayout>
  );
}
