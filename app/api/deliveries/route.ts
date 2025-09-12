// app/api/deliveries/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Consulta SQL CORREGIDA: Ya no se une con APP_PRODUCTOS_FORMATOS
    const q = `
      SELECT
        d.id,
        d.order_id,
        d.status,
        d.loaded_quantity,
        d.loaded_at,
        d.exited_at,
        d.notes,
        d.load_photo_url, 
        d.exit_photo_url,
        p.order_number,
        c.name  AS client_name,
        t.placa AS truck_placa,
        pi.quantity as cantidadBase,
        -- Obtenemos los datos directamente del producto a través de la vista
        prod.id as product_id,
        prod.name as product_name,
        prod.unit as unidadBase 
      FROM RIP.APP_DESPACHOS d
      JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      JOIN RIP.APP_CAMIONES t ON t.id = p.truck_id
      -- Unimos con el primer item del pedido para obtener el producto
      LEFT JOIN (
          SELECT order_id, MIN(id) as min_item_id
          FROM RIP.APP_PEDIDOS_ITEMS
          GROUP BY order_id
      ) first_item ON first_item.order_id = p.id
      LEFT JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.id = first_item.min_item_id
      -- Unimos directamente a la vista de productos
      LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = pi.product_id
      ORDER BY d.id DESC;
    `;
    const rows = await executeQuery(q);
    
    // Mapeo de respuesta CORREGIDO
    const out = rows.map((r: any) => ({
      id: r.id,
      orderId: r.order_id,
      estado: r.status,
      loadedQuantity: r.loaded_quantity ? Number(r.loaded_quantity) : null,
      loadedAt: r.loaded_at ? new Date(r.loaded_at) : null,
      exitedAt: r.exited_at ? new Date(r.exited_at) : null,
      notes: r.notes ?? null,
      loadPhoto: r.load_photo_url ?? null, 
      exitPhoto: r.exit_photo_url ?? null,
      order: { id: r.order_id, orderNumber: r.order_number, client: { nombre: r.client_name } },
      client: { nombre: r.client_name },
      truck: { placa: r.truck_placa },
      // Objeto simplificado a "product" en lugar de "productFormat"
      product: {
          id: r.product_id,
          nombre: r.product_name,
          unit: r.unidadBase
      },
      cantidadBase: Number(r.cantidadBase) || 0
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error('[API_DELIVERIES_GET]', e);
    return new NextResponse('Error al obtener despachos', { status: 500 });
  }
}