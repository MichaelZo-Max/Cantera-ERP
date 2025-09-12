// app/api/product-formats/route.ts

import { NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db';
import type { ProductFormat } from '@/lib/types';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic'

/**
 * @route   GET /api/product-formats
 * @desc    Obtener los formatos de un producto específico desde la BDD
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      // Si no se especifica un producto, no se devuelven formatos.
      return NextResponse.json([]);
    }

    const query = `
      SELECT
        id,
        product_id AS productId,
        unit_base AS unidadBase,
        base_unit_factor AS factorUnidadBase,
        sku,
        price_per_unit AS pricePerUnit,
        is_active AS activo
      FROM RIP.APP_PRODUCTOS_FORMATOS
      WHERE product_id = @productId AND is_active = 1;
    `;

    const params = [
      { name: 'productId', type: TYPES.Int, value: parseInt(productId, 10) }
    ];

    const formatsData = await executeQuery(query, params);

    // Mapeamos para asegurar que los tipos coincidan con lo que espera el frontend
    const productFormats: ProductFormat[] = formatsData.map(f => ({
      id: f.id.toString(),
      productId: f.productId.toString(),
      unidadBase: f.unidadBase,
      factorUnidadBase: f.factorUnidadBase,
      sku: f.sku,
      pricePerUnit: f.pricePerUnit,
      activo: f.activo,
      createdAt: new Date(), // Dummy date, no es crucial para este flujo
      updatedAt: new Date(), // Dummy date
    }));

    return NextResponse.json(productFormats);
  } catch (error) {
    console.error('[API_PRODUCT_FORMATS_GET]', error);
    return new NextResponse('Error al obtener los formatos del producto', { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { product_id, sku, price_per_unit, unit_base, base_unit_factor } = body;

        if (!product_id || !price_per_unit || !unit_base) {
            return new NextResponse("Producto, precio y unidad base son requeridos", { status: 400 });
        }

        const query = `
            INSERT INTO RIP.APP_PRODUCTOS_FORMATOS (product_id, sku, price_per_unit, unit_base, base_unit_factor)
            OUTPUT INSERTED.*
            VALUES (@product_id, @sku, @price, @unit_base, @factor);
        `;

        const params = [
            { name: 'product_id', type: TYPES.Int, value: product_id },
            { name: 'sku', type: TYPES.NVarChar, value: sku },
            { name: 'price', type: TYPES.Decimal, value: price_per_unit },
            { name: 'unit_base', type: TYPES.NVarChar, value: unit_base },
            { name: 'factor', type: TYPES.Decimal, value: base_unit_factor ?? 1 },
        ];
        
        const result = await executeQuery(query, params);

        // ✨ INVALIDACIÓN DEL CACHÉ
        revalidateTag('product-formats');
        revalidateTag('products');

        return NextResponse.json(result[0], { status: 201 });

    } catch (error) {
        console.error('[API_FORMATS_POST]', error);
        return new NextResponse('Error al crear el formato', { status: 500 });
    }
}
