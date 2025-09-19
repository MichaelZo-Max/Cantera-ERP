// lib/auth.ts

import { cookies } from "next/headers";
import * as jose from "jose";
import type { User, UserRole } from "./types"; // Importamos UserRole también

/**
 * Función segura para obtener el usuario en el servidor.
 */
export async function getUser(): Promise<{ user: User | null }> {
  const cookie = cookies().get("session");

  if (!cookie?.value) {
    return { user: null };
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jose.jwtVerify(cookie.value, secret);

    // CORRECCIÓN DE TIPOS:
    // Aseguramos que los tipos del payload coincidan con el tipo User.
    const user: User = {
      // Convertimos el ID a string para que coincida con el tipo
      id: Number(payload.id),
      email: payload.email as string,
      name: payload.name as string, // Asegúrate de que tu token incluya el name
      // Hacemos un type assertion a UserRole para que coincida
      role: payload.role as UserRole,
      is_active: payload.is_active as boolean, // Asegúrate de incluir esto en el token
      // Las fechas se manejarán como strings o numbers en el token,
      // aquí las dejamos como vienen y las parseamos si es necesario en el cliente.
      createdAt: new Date(payload.createdAt as string | number),
      updatedAt: new Date(payload.updatedAt as string | number),
    };

    return { user };
  } catch (error) {
    console.error("Fallo al verificar el token de sesión:", error);
    return { user: null };
  }
}
