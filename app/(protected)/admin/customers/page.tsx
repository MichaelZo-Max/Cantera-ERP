// app/(protected)/admin/customers/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import type { Client } from "@/lib/types";
import { CustomersClientUI } from "./customers-client"; // Importamos el nuevo componente de cliente

// Función para obtener los datos en el servidor
async function getCustomers(): Promise<{ customers: Client[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/api/customers`, {
      next: { tags: ["customers"] },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch customers");
    }

    const customers = await res.json();
    return { customers };
  } catch (error) {
    console.error("Error cargando clientes en el servidor:", error);
    return { customers: [] };
  }
}

// Esta página ahora es un Server Component (no tiene "use client")
export default async function CustomersPage() {
  // Obtenemos los datos directamente en el servidor
  const { customers } = await getCustomers();

  return (
    <AppLayout title="Gestión de Clientes">
      {/* Renderizamos el componente de cliente y le pasamos los datos iniciales.
        El HTML de la lista de clientes ya viene pre-renderizado desde el servidor.
      */}
      <CustomersClientUI initialCustomers={customers} />
    </AppLayout>
  );
}
