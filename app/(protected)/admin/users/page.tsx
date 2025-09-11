// app/(protected)/admin/users/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import type { User } from "@/lib/types";
import { UsersClientUI } from "./users-client"; // Importamos el componente de cliente

// Función para obtener los datos en el servidor
async function getUsers(): Promise<{ users: User[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/users`, {
      next: {
        revalidate: 60, // Revalida en segundo plano cada 60 segundos
        tags: ["users"], // Etiqueta para invalidar la caché de usuarios
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }

    const users = await res.json();
    return { users };
  } catch (error) {
    console.error("Error cargando usuarios en el servidor:", error);
    return { users: [] };
  }
}

// Esta página ahora es un Server Component
export default async function UsersPage() {
  const { users } = await getUsers();

  return (
    <AppLayout title="Gestión de Usuarios">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <UsersClientUI initialUsers={users} />
    </AppLayout>
  );
}
