// app/(protected)/yard/deliveries/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Delivery } from "@/lib/types";
import { YardDeliveriesClientUI } from "./yard-deliveries-client"; // Importamos el nuevo componente

// Función para obtener los datos en el servidor
async function getDeliveries(): Promise<{ deliveries: Delivery[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    
    const res = await fetch(`${baseUrl}/api/deliveries`, {
      next: {
        revalidate: 60, // Revalida en segundo plano cada 60 segundos
        tags: ["deliveries"], // Etiqueta para invalidar la caché al instante
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
export default async function YardDeliveriesPage() {
  const { deliveries } = await getDeliveries();

  return (
    <AppLayout title="Gestión de Patio">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <YardDeliveriesClientUI initialDeliveries={deliveries} />
    </AppLayout>
  );
}