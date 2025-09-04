import { NextResponse } from "next/server";
import { mockDrivers } from "@/lib/mock-data";
import type { Driver } from "@/lib/types";

export async function GET() {
  return NextResponse.json(mockDrivers);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.nombre) {
    return new NextResponse("El nombre es requerido", { status: 400 });
  }
  const newDriver: Driver = {
    id: `driver_${Date.now()}`,
    ...body,
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDrivers.push(newDriver);
  return NextResponse.json(newDriver, { status: 201 });
}
