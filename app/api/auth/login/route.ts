// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { executeQuery, TYPES } from "@/lib/db";
import type { User } from "@/lib/types";

// Esquema de validación para el login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse("Datos inválidos", { status: 400 });
    }

    const { email, password } = validation.data;

    // 1. Buscar al usuario en la base de datos (CON LOS NOMBRES CORRECTOS)
    const userSql = `
      SELECT id, name, email, password_hash, role, is_active 
      FROM RIP.APP_USUARIOS 
      WHERE email = @email
    `;
    const userParams = [{ name: "email", type: TYPES.NVarChar, value: email }];
    const userResult = await executeQuery<any>(userSql, userParams);

    const user = userResult[0];

    if (!user) {
      return new NextResponse("Credenciales incorrectas", { status: 401 });
    }

    // 2. Verificar la contraseña (usando la columna 'password_hash')
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return new NextResponse("Credenciales incorrectas", { status: 401 });
    }

    // 3. Crear el token JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const alg = "HS256";
    const token = await new jose.SignJWT({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        is_active: user.is_active,
      })
      .setProtectedHeader({ alg })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(secret);

    // 4. Preparar la respuesta y establecer la cookie segura
    const userResponse: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    
    const response = NextResponse.json(userResponse);

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return response;

  } catch (error) {
    console.error("[API_LOGIN_POST]", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}