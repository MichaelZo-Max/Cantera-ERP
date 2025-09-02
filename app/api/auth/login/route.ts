import { NextResponse } from 'next/server';
import { mockUsers } from "@/lib/mock-data"
import type { User } from '@/lib/types';

// Simula un pequeño retraso
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar un usuario
 */
export async function POST(request: Request) {
  try {
    // 1. Obtener el cuerpo de la petición
    const body = await request.json();
    
    // 2. Desestructurar el body correctamente usando "="
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse('Email y contraseña son requeridos', { status: 400 });
    }

    await sleep(1000); // Simula la llamada a la base de datos

    const user = mockUsers.find((u) => u.email === email);

    // 3. Lógica de autenticación (sin cambios)
    if (user && password === '123456' && user.isActive) {
      return NextResponse.json(user);
    } else {
      return new NextResponse('Credenciales inválidas o usuario inactivo', { status: 401 });
    }
  } catch (error) {
    // 4. Capturar cualquier error inesperado y registrarlo en la consola del servidor
    console.error('[API_AUTH_LOGIN_POST] Error:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}