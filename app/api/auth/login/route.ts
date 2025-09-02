import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/auth';
import type { User } from '@/lib/types';

// Simula un pequeño retraso
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar un usuario
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse('Email y contraseña son requeridos', { status: 400 });
    }

    await sleep(1000); // Simula la llamada a la base de datos

    const user = mockUsers.find((u) => u.email === email);

    // En un proyecto real, aquí verificarías el hash de la contraseña
    if (user && password === '123456' && user.isActive) {
      // No devuelvas la contraseña en la respuesta
      const { ...userWithoutPassword } = user;
      return NextResponse.json(userWithoutPassword);
    } else {
      return new NextResponse('Credenciales inválidas o usuario inactivo', { status: 401 });
    }
  } catch (error) {
    console.error('[API_AUTH_LOGIN_POST]', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}