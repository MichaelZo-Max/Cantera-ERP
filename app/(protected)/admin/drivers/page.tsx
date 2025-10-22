// app/(protected)/admin/drivers/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
// Asegúrate de importar los tipos necesarios
import type { Driver, Client, PaginatedResponse } from "@/lib/types";
import { DriversClientUI } from "./drivers-client";

// La función getDrivers se mantiene igual
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
    return [];
  }
}

// MODIFICACIÓN: Actualizar getClients para obtener datos paginados
async function getClients(): Promise<PaginatedResponse<Client>> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // Hacemos la petición a la primera página por defecto
    const res = await fetch(`${baseUrl}/api/customers?page=1&limit=45`, {
      next: { tags: ["customers"] },
    });
    if (!res.ok) throw new Error("Failed to fetch clients");
    return res.json();
  } catch (error) {
    console.error("Error cargando clientes:", error);
    // ✨ CORRECCIÓN: Se añaden las propiedades que faltan para cumplir con el tipo
    return {
      data: [],
      totalPages: 0,
      total: 0,
      page: 1,
      limit: 20,
    };
  }
}

export default async function DriversPage() {
  // Obtenemos los datos en paralelo
  const [drivers, clientsResponse] = await Promise.all([
    getDrivers(),
    getClients(),
  ]);

  return (
    <AppLayout title="Gestión de Choferes">
      <DriversClientUI
        initialDrivers={drivers}
        // Pasamos los datos iniciales de clientes y la paginación
        initialCustomers={clientsResponse.data}
        totalPages={clientsResponse.totalPages}
      />
    </AppLayout>
  );
}