import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock-data';
import type { User } from '@/lib/types';

export async function GET() {
  return NextResponse.json(mockUsers);
}

export async function POST(request: Request) {
    const body = await request.json();
    if (!body.name || !body.email || !body.role) {
        return new NextResponse("Nombre, email y rol son requeridos", { status: 400 });
    }
    const newUser: User = {
        id: `user_${Date.now()}`,
        ...body,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return NextResponse.json(newUser, { status: 201 });
}