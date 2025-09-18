// lib/authz.ts

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import type { UserRole } from "./types";

// Definimos un tipo base para el contexto que todas las rutas dinámicas tendrán.
type BaseApiHandlerContext = { params: { [key: string]: string | string[] | undefined } };

// ✨ CORRECCIÓN 1: Hacemos que el tipo ApiHandler sea genérico.
// "T" representará el contexto específico de la ruta (ej. { params: { id: string } }).
// Por defecto, será el tipo base para rutas no dinámicas.
type ApiHandler<T extends BaseApiHandlerContext = BaseApiHandlerContext> = (
  request: NextRequest,
  context: T
) => Promise<Response>;

/**
 * Función de orden superior GENÉRICA para envolver manejadores de API y verificar roles.
 * @param allowedRoles - Un array de roles que tienen permiso para acceder.
 * @param handler - El manejador de la ruta de API original, con su tipo de contexto específico.
 * @returns Un nuevo manejador que primero verifica la autorización y mantiene el tipado.
 */
export function withAuthorization<T extends BaseApiHandlerContext>( // ✨ CORRECCIÓN 2: La función ahora es genérica
  allowedRoles: UserRole[],
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (request, context) => { // "context" ahora tiene el tipo genérico "T"
    // 1. Obtener el usuario de la sesión
    const { user } = await getUser();

    // 2. Verificar si el usuario está autenticado
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "No autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar si el rol del usuario está en la lista de roles permitidos
    if (!allowedRoles.includes(user.role)) {
      return new NextResponse(
        JSON.stringify({ message: "Acceso prohibido" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Si todo está bien, ejecutar el manejador original
    return handler(request, context); // Pasamos el 'context' con su tipo específico preservado
  };
}