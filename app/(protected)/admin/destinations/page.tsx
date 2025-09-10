// app/(protected)/admin/destinations/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Destination, Client } from "@/lib/types";
import { DestinationsClientUI } from "./destinations-client"; // Importamos el nuevo componente

// Función para obtener los datos en el servidor
async function getDestinationsAndClients(): Promise<{
  destinations: Destination[];
  clients: Client[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const [destRes, clientRes] = await Promise.all([
      fetch(`${baseUrl}/api/destinations`, {
        next: { revalidate: 60, tags: ["destinations"] },
      }),
      fetch(`${baseUrl}/api/customers`, {
        next: { revalidate: 60, tags: ["customers"] },
      }),
    ]);

    if (!destRes.ok) throw new Error("Error al cargar destinos");
    if (!clientRes.ok) throw new Error("Error al cargar clientes");

    const destinations = await destRes.json();
    const clients = await clientRes.json();

    return { destinations, clients };
  } catch (error) {
    console.error("Error cargando datos en el servidor:", error);
    // Devolvemos arrays vacíos para que la UI no se rompa
    return { destinations: [], clients: [] };
  }
}

// Esta página ahora es un Server Component (no tiene "use client")
export default async function DestinationsPage() {
  // Obtenemos los datos directamente en el servidor al renderizar la página
  const { destinations, clients } = await getDestinationsAndClients();

  return (
    <AppLayout title="Gestión de Destinos">
      {/* Renderizamos el componente de cliente y le pasamos los datos iniciales.
        La lista de destinos ya viene pre-renderizada desde el servidor.
      */}
      <DestinationsClientUI
        initialDestinations={destinations}
        initialClients={clients}
      />
    </AppLayout>
  );
}
