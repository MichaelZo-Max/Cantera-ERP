// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';

/**
 * @route   GET /api/products/[id]
 * @desc    Obtener un producto por ID
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const query = "SELECT * FROM RIP.VW_APP_PRODUCTOS WHERE id = @id";
    const result = await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
    if (result.length === 0) {
      return new NextResponse('Producto no encontrado', { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[API_PRODUCTS_GET_BY_ID]', error);
    return new NextResponse('Error al obtener el producto', { status: 500 });
  }
}

/**
 * @route   PATCH /api/products/[id]
 * @desc    Actualizar un producto
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { codigo, nombre, area, is_active } = body;

        const query = `
            UPDATE dbo.ARTICULOS
            SET
                REFPROVEEDOR = @codigo,
                DESCRIPCION = @nombre,
                // No hay un campo 'area' en la tabla de artículos, se omite por ahora.
                DESCATALOGADO = @is_active
            OUTPUT INSERTED.CODARTICULO as id, INSERTED.REFPROVEEDOR as codigo, INSERTED.DESCRIPCION as nombre, IIF(INSERTED.DESCATALOGADO = 'F', 1, 0) as isActive
            WHERE CODARTICULO = @id;
        `;
        const queryParams = [
            { name: 'id', type: TYPES.Int, value: params.id },
            { name: 'codigo', type: TYPES.NVarChar, value: codigo },
            { name: 'nombre', type: TYPES.NVarChar, value: nombre },
            { name: 'is_active', type: TYPES.Char, value: is_active ? 'F' : 'T' }
        ];

        const result = await executeQuery(query, queryParams);
        if (result.length === 0) {
            return new NextResponse('Producto no encontrado para actualizar', { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('[API_PRODUCTS_PATCH]', error);
        return new NextResponse('Error al actualizar el producto', { status: 500 });
    }
}


/**
 * @route   DELETE /api/products/[id]
 * @desc    Desactivar un producto (borrado lógico)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const query = `
            UPDATE dbo.ARTICULOS
            SET DESCATALOGADO = 'T'
            WHERE CODARTICULO = @id;
        `;
        await executeQuery(query, [{ name: 'id', type: TYPES.Int, value: params.id }]);
        return NextResponse.json({ message: 'Producto desactivado correctamente' });
    } catch (error) {
        console.error('[API_PRODUCTS_DELETE]', error);
        return new NextResponse('Error al desactivar el producto', { status: 500 });
    }
}