import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { TYPES } from 'tedious';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email ? String(body.email).trim() : '';
    const password = body.password ? String(body.password).trim() : '';

    if (!email || !password) {
      return new NextResponse('Email y contraseña son requeridos', { status: 400 });
    }

    const query = `
      SELECT id, name, email, role, password_hash, is_active 
      FROM RIP.APP_USUARIOS 
      WHERE email = @email;
    `;

    const params = [{ name: 'email', type: TYPES.NVarChar, value: email }];
    const result = await executeQuery(query, params) as any[];

    if (result.length === 0) {
      return new NextResponse('Credenciales inválidas', { status: 401 });
    }

    const user = result[0];

    if (!user.is_active) {
        return new NextResponse('Usuario inactivo', { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return new NextResponse('Credenciales inválidas', { status: 401 });
    }

    const userToReturn: Partial<User> = {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active
    };

    return NextResponse.json(userToReturn);

  } catch (error) {
    console.error('[API_AUTH_LOGIN_POST] Error:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}