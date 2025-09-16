// app/(protected)/admin/drivers/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
// Asegúrate de importar ambos tipos
import type { Driver, Client } from "@/lib/types"; 
import { DriversClientUI } from "./drivers-client";

// Función para obtener los choferes
async function getDrivers(): Promise<Driver[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/api/drivers`, {
      next: { tags: ["drivers"] },
    });
    if (!res.ok) throw new Error("Failed to fetch drivers");
    return res.json();
  } catch (error) {
    console.error("Error cargando choferes:", error);
    return []; // Devuelve un array vacío en caso de error
  }
}

// NUEVA FUNCIÓN: para obtener los clientes
async function getClients(): Promise<Client[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // La API de clientes se llama 'customers' según la estructura del proyecto
    const res = await fetch(`${baseUrl}/api/customers`, {
      next: { tags: ["customers"] },
    });
    if (!res.ok) throw new Error("Failed to fetch clients");
    return res.json();
  } catch (error) {
    console.error("Error cargando clientes:", error);
    return [];
  }
}

export default async function DriversPage() {
  // Llamamos a ambas funciones para obtener los datos en paralelo
  const [drivers, clients] = await Promise.all([
    getDrivers(),
    getClients(),
  ]);

  return (
    <AppLayout title="Gestión de Choferes">
      <DriversClientUI 
        initialDrivers={drivers} 
        initialCustomers={clients} // Pasamos la nueva prop con los clientes
      />
    </AppLayout>
  );
}