// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { revalidateTag } from 'next/cache'; // Importamos revalidateTag

/**
 * @route GET /api/users
 * @desc Obtener todos los usuarios
 */
export async function GET() {
  try {
    const query = `
      SELECT id, email, name, role, is_active 
      FROM RIP.APP_USUARIOS 
      ORDER BY name;
    `;
    const users = await executeQuery(query);
    return NextResponse.json(users);
  } catch (error) {
    console.error('[API_USERS_GET]', error);
    return new NextResponse('Error al obtener usuarios', { status: 500 });
  }
}

/**
 * @route POST /api/users
 * @desc Crear un nuevo usuario
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role, password } = body;

    if (!email || !name || !role || !password) {
      return new NextResponse('Todos los campos son requeridos', { status: 400 });
    }
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO RIP.APP_USUARIOS (email, name, role, password_hash)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.name, INSERTED.role, INSERTED.is_active
      VALUES (@email, @name, @role, @password_hash);
    `;

    const params = [
      { name: 'email', type: TYPES.NVarChar, value: email },
      { name: 'name', type: TYPES.NVarChar, value: name },
      { name: 'role', type: TYPES.NVarChar, value: role },
      { name: 'password_hash', type: TYPES.NVarChar, value: password_hash },
    ];

    const result = await executeQuery(query, params);

    // ✨ INVALIDACIÓN DEL CACHÉ
    revalidateTag('users');

    return NextResponse.json(result[0], { status: 201 });

  } catch (error) {
    console.error('[API_USERS_POST]', error);
    return new NextResponse('Error al crear el usuario', { status: 500 });
  }
}
