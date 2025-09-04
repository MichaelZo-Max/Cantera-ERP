import { NextResponse } from "next/server";
import { mockDrivers } from "@/lib/mock-data";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const index = mockDrivers.findIndex((d) => d.id === params.id);
  if (index === -1) {
    return new NextResponse("Chofer no encontrado", { status: 404 });
  }
  const body = await request.json();
  mockDrivers[index] = {
    ...mockDrivers[index],
    ...body,
    updatedAt: new Date(),
  };
  return NextResponse.json(mockDrivers[index]);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const index = mockDrivers.findIndex((d) => d.id === params.id);
  if (index === -1) {
    return new NextResponse("Chofer no encontrado", { status: 404 });
  }
  // Toggle status para activar/desactivar
  mockDrivers[index].is_active = !mockDrivers[index].is_active;
  mockDrivers[index].updatedAt = new Date();
  return NextResponse.json({ message: "Estado del chofer actualizado" });
}
