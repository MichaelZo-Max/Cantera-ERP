// app/(protected)/admin/trucks/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Truck as TruckType, Driver } from "@/lib/types";
import { TrucksClientUI } from "./trucks-client"; // Importamos el nuevo componente de cliente

// Función para cargar los datos en el servidor
async function getTrucksAndDrivers(): Promise<{ trucks: TruckType[]; drivers: Driver[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const [trucksRes, driversRes] = await Promise.all([
      fetch(`${baseUrl}/api/trucks`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/drivers`, { cache: "no-store" }),
    ]);

    if (!trucksRes.ok) throw new Error('Error al cargar camiones');
    if (!driversRes.ok) throw new Error('Error al cargar choferes');

    const trucks = await trucksRes.json();
    const drivers = await driversRes.json();
    
    return { trucks, drivers };
  } catch (error) {
    console.error("Error cargando datos en el servidor:", error);
    // En caso de error, devolvemos arrays vacíos para que la página no se rompa.
    return { trucks: [], drivers: [] };
  }
}

// ¡Esta página ahora es un Server Component! (No tiene "use client")
export default async function TrucksPage() {
  // Obtenemos los datos directamente en el servidor
  const { trucks, drivers } = await getTrucksAndDrivers();

  return (
    <AppLayout title="Gestión de Camiones">
      {/* Renderizamos el componente de cliente y le pasamos los datos iniciales.
        El HTML de la lista de camiones ya viene pre-renderizado del servidor.
      */}
      <TrucksClientUI initialTrucks={trucks} initialDrivers={drivers} />
    </AppLayout>
  );
}