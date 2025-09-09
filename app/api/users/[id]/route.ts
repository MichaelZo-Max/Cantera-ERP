// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * @route GET /api/users/[id]
 * @desc Obtener un usuario por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = "SELECT id, email, name, role, is_active FROM RIP.APP_USUARIOS WHERE id = @id";
        const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        if (result.length === 0) {
            return new NextResponse('Usuario no encontrado', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_USERS_GET_BY_ID]', error);
        return new NextResponse('Error al obtener el usuario', { status: 500 });
    }
}

/**
 * @route PATCH /api/users/[id]
 * @desc Actualizar un usuario dinámicamente
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return new NextResponse('ID de usuario inválido', { status: 400 });
        }

        const body = await request.json();
        
        const updates: string[] = [];
        const queryParams: any[] = [{ name: 'id', type: TYPES.Int, value: id }];

        if (body.name !== undefined) {
            updates.push("name = @name");
            queryParams.push({ name: 'name', type: TYPES.NVarChar, value: body.name });
        }
        if (body.email !== undefined) {
            updates.push("email = @email");
            queryParams.push({ name: 'email', type: TYPES.NVarChar, value: body.email });
        }
        if (body.role !== undefined) {
            updates.push("role = @role");
            queryParams.push({ name: 'role', type: TYPES.NVarChar, value: body.role });
        }
        if (body.is_active !== undefined) {
            updates.push("is_active = @is_active");
            queryParams.push({ name: 'is_active', type: TYPES.Bit, value: body.is_active });
        }
        if (body.password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(body.password, salt);
            updates.push("password_hash = @password_hash");
            queryParams.push({ name: 'password_hash', type: TYPES.NVarChar, value: password_hash });
        }

        if (updates.length === 0) {
            return new NextResponse('No hay campos para actualizar', { status: 400 });
        }

        updates.push("updated_at = GETDATE()");

        const query = `
            UPDATE RIP.APP_USUARIOS
            SET ${updates.join(', ')}
            OUTPUT INSERTED.id, INSERTED.email, INSERTED.name, INSERTED.role, INSERTED.is_active
            WHERE id = @id;
        `;

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Usuario no encontrado para actualizar', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_USERS_PATCH]', error);
        return new NextResponse('Error al actualizar el usuario', { status: 500 });
    }
}

/**
 * @route DELETE /api/users/[id]
 * @desc Desactivar un usuario (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = `
            UPDATE RIP.APP_USUARIOS
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        return NextResponse.json({ message: 'Usuario desactivado correctamente' });
    } catch (error) {
        console.error('[API_USERS_DELETE]', error);
        return new NextResponse('Error al desactivar el usuario', { status: 500 });
    }
}