// app/(protected)/admin/drivers/page.tsx

export const dynamic = 'force-dynamic'

import { AppLayout } from "@/components/app-layout";
import type { Driver } from "@/lib/types";
import { DriversClientUI } from "./drivers-client"; // Importamos el componente de cliente

// Función para obtener los datos en el servidor
async function getDrivers(): Promise<{ drivers: Driver[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    
    const res = await fetch(`${baseUrl}/api/drivers`, {
      next: { 
        revalidate: 60,
        tags: ["drivers"] 
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch drivers");
    }

    const drivers = await res.json();
    return { drivers };
  } catch (error) {
    console.error("Error cargando choferes en el servidor:", error);
    return { drivers: [] };
  }
}

// La página ahora es un Server Component, por eso es `async`
export default async function DriversPage() {
  const { drivers } = await getDrivers();

  return (
    <AppLayout title="Gestión de Choferes">
      {/* Pasamos los datos iniciales al componente de cliente para que los renderice */}
      <DriversClientUI initialDrivers={drivers} />
    </AppLayout>
  );
}
