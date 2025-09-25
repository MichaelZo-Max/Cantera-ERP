// app/(protected)/admin/users/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import type { User } from "@/lib/types";
import { UsersClientUI } from "./users-client";
import { cookies } from "next/headers"; // ✨ 1. Importar 'cookies' de Next.js

// Función para obtener los datos en el servidor (ahora autenticada)
async function getUsers(): Promise<{ users: User[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const cookie = cookies().get("session")?.value;

    const res = await fetch(`${baseUrl}/api/users`, {
      headers: {
        Cookie: `session=${cookie}`,
      },
      next: {
        revalidate: 60,
        tags: ["users"],
      },
    });

    if (!res.ok) {
      // Lanzamos el error para que sea capturado por el catch
      throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
    }

    const users = await res.json();
    return { users };
  } catch (error) {
    console.error("Error cargando usuarios en el servidor:", error);
    // Devolvemos un array vacío para que la página no se rompa
    return { users: [] };
  }
}

// Esta página es un Server Component que obtiene los datos
export default async function UsersPage() {
  const { users } = await getUsers();

  return (
    <AppLayout title="Gestión de Usuarios">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <UsersClientUI initialUsers={users} />
    </AppLayout>
  );
}
