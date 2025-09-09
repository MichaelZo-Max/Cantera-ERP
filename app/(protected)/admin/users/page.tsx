// app/(protected)/admin/users/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { User } from "@/lib/types";
import { UsersClientUI } from "./users-client"; // Importamos el componente de cliente

// Función para obtener los datos en el servidor
async function getUsers(): Promise<{ users: User[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/users`, { cache: "no-store" });
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
