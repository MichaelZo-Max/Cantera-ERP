// app/(protected)/security/exits/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Delivery } from "@/lib/types";
import { SecurityExitsClientUI } from "./exits-client"; // Importamos el nuevo componente de cliente

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

// La página ahora es un Server Component
export default async function SecurityExitsPage() {
  const { deliveries } = await getDeliveries();

  return (
    <AppLayout title="Control de Salida">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <SecurityExitsClientUI initialDeliveries={deliveries} />
    </AppLayout>
  );
}