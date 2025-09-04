// app/api/customers/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route   GET /api/customers/[id]
 * @desc    Obtener un cliente por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = "SELECT * FROM RIP.VW_APP_CLIENTES WHERE id = @id";
        const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        if (result.length === 0) {
            return new NextResponse('Cliente no encontrado', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_CUSTOMERS_GET_BY_ID]', error);
        return new NextResponse('Error al obtener el cliente', { status: 500 });
    }
}

/**
 * @route   PATCH /api/customers/[id]
 * @desc    Actualizar un cliente
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { nombre, rif, address, phone, email, is_active } = body;

        const query = `
            UPDATE dbo.CLIENTES
            SET
                NOMBRECLIENTE = @nombre,
                NIF20 = @rif,
                DIRECCION1 = @address,
                TELEFONO1 = @phone,
                E_MAIL = @email,
                DESCATALOGADO = @is_active
            OUTPUT INSERTED.CODCLIENTE as id, INSERTED.NOMBRECLIENTE as nombre, INSERTED.NIF20 as rif, INSERTED.DIRECCION1 as address, INSERTED.TELEFONO1 as phone, INSERTED.E_MAIL as email, IIF(INSERTED.DESCATALOGADO = 'F', 1, 0) as isActive
            WHERE CODCLIENTE = @id;
        `;
        const queryParams = [
            { name: 'id', type: TYPES.Int, value: params.id },
            { name: 'nombre', type: TYPES.NVarChar, value: nombre },
            { name: 'rif', type: TYPES.NVarChar, value: rif },
            { name: 'address', type: TYPES.NVarChar, value: address },
            { name: 'phone', type: TYPES.NVarChar, value: phone },
            { name: 'email', type: TYPES.NVarChar, value: email },
            { name: 'is_active', type: TYPES.Char, value: is_active ? 'F' : 'T' }
        ];

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Cliente no encontrado para actualizar', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_CUSTOMERS_PATCH]', error);
        return new NextResponse('Error al actualizar el cliente', { status: 500 });
    }
}


/**
 * @route   DELETE /api/customers/[id]
 * @desc    Desactivar un cliente
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = `
            UPDATE dbo.CLIENTES
            SET DESCATALOGADO = 'T'
            WHERE CODCLIENTE = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        return NextResponse.json({ message: 'Cliente desactivado correctamente' });
    } catch (error) {
        console.error('[API_CUSTOMERS_DELETE]', error);
        return new NextResponse('Error al desactivar el cliente', { status: 500 });
    }
}