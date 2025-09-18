// app/api/users/route.ts

import { NextResponse, NextRequest } from "next/server"; // Importa NextRequest
import { executeQuery, TYPES } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidateTag } from "next/cache";
import { createUserSchema } from "@/lib/validations";
import { withAuthorization } from "@/lib/authz"; // ✨ 1. Importa el wrapper

export const dynamic = "force-dynamic";

/**
 * @route GET /api/users
 * @desc Obtener todos los usuarios (SOLO ADMINS)
 */
async function handlerGET(request: NextRequest) {
  // La lógica original se mueve a una función separada
  try {
    const query = `
      SELECT id, email, name, role, is_active 
      FROM RIP.APP_USUARIOS 
      ORDER BY name;
    `;
    const users = await executeQuery(query);
    return NextResponse.json(users);
  } catch (error) {
    console.error("[API_USERS_GET]", error);
    return new NextResponse("Error al obtener usuarios", { status: 500 });
  }
}

/**
 * @route POST /api/users
 * @desc Crear un nuevo usuario (SOLO ADMINS)
 */
async function handlerPOST(request: NextRequest) {
  // La lógica original se mueve a una función separada
  try {
    const body = await request.json().catch(() => ({}));
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { email, name, role, password } = validation.data;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const query = `
      INSERT INTO RIP.APP_USUARIOS (email, name, role, password_hash, is_active)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.name, INSERTED.role, INSERTED.is_active
      VALUES (@email, @name, @role, @password_hash, 1);
    `;
    const params = [
      { name: "email", type: TYPES.NVarChar, value: email },
      { name: "name", type: TYPES.NVarChar, value: name },
      { name: "role", type: TYPES.NVarChar, value: role },
      { name: "password_hash", type: TYPES.NVarChar, value: password_hash },
    ];
    const result = await executeQuery(query, params);
    revalidateTag("users");
    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("[API_USERS_POST]", error);
    if (error.message && error.message.includes("Violation of UNIQUE KEY constraint")) {
      return new NextResponse(
        JSON.stringify({ email: ["El correo electrónico ya está en uso."] }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    return new NextResponse("Error al crear el usuario", { status: 500 });
  }
}

// ✨ 2. Exporta las funciones envueltas en el chequeo de autorización
export const GET = withAuthorization(["ADMIN"], handlerGET);
export const POST = withAuthorization(["ADMIN"], handlerPOST);