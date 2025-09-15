// app/api/auth/me/route.ts

import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  // Usamos la función del backend que ya creamos
  const { user } = await getUser();

  if (!user) {
    return new NextResponse(
        JSON.stringify({ message: "No autorizado" }), 
        { status: 401 }
    );
  }

  // Si hay un usuario, lo devolvemos
  return NextResponse.json({ user });
}