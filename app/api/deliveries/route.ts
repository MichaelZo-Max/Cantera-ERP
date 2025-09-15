import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { TYPES } from "tedious";

export const dynamic = "force-dynamic";

// --- GET: Obtener todos los despachos (SIN CAMBIOS, YA ERA CORRECTO) ---
export async function GET() {
    try {
        const query = `
            SELECT
                d.id, d.estado, d.notes, d.load_photo_url as loadPhoto,
                p.id as order_id, p.order_number as orderNumber,
                c.id as client_id, c.name as client_name,
                t.id as truck_id, t.placa,
                dr.id as driver_id, dr.name as driver_name, dr.phone as driver_phone,
                pi.id as pedido_item_id, 
                pi.quantity as cantidadSolicitada, 
                pi.unit,
                prod.id as product_id, 
                prod.name as product_name
            FROM RIP.APP_DESPACHOS d
            JOIN RIP.APP_PEDIDOS p ON p.id = d.order_id
            JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
            JOIN RIP.APP_CAMIONES t ON t.id = d.truck_id
            JOIN RIP.APP_CHOFERES dr ON dr.id = d.driver_id
            LEFT JOIN RIP.APP_PEDIDOS_ITEMS pi ON pi.order_id = p.id
            LEFT JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = pi.product_id
            ORDER BY d.created_at DESC;
        `;

        const rows = await executeQuery(query);

        const deliveriesMap = new Map();
        for (const row of rows) {
            if (!deliveriesMap.has(row.id)) {
                deliveriesMap.set(row.id, {
                    id: row.id,
                    estado: row.estado,
                    notes: row.notes,
                    loadPhoto: row.loadPhoto,
                    order: {
                        id: row.order_id,
                        orderNumber: row.orderNumber,
                        client: { id: row.client_id, name: row.client_name },
                        items: [],
                    },
                    truck: { id: row.truck_id, placa: row.placa },
                    driver: { id: row.driver_id, name: row.driver_name, phone: row.driver_phone },
                });
            }
            
            const delivery = deliveriesMap.get(row.id);
            if (row.pedido_item_id) {
                delivery.order.items.push({
                    id: row.pedido_item_id,
                    cantidadSolicitada: row.cantidadSolicitada,
                    product: {
                        id: row.product_id,
                        name: row.product_name,
                        unit: row.unit,
                    },
                });
            }
        }

        const deliveries = Array.from(deliveriesMap.values());
        return NextResponse.json(deliveries);

    } catch (e) {
        console.error("[API_DELIVERIES_GET]", e);
        return new NextResponse("Error al obtener despachos", { status: 500 });
    }
}

// --- POST: Crear un nuevo despacho (VERSIÓN CORREGIDA) ---
const createDeliverySchema = z.object({
  orderId: z.number().int().positive(),
  truckId: z.number().int().positive(),
  driverId: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, truckId, driverId } = createDeliverySchema.parse(body);

    // Insertamos el nuevo despacho y obtenemos el registro completo de vuelta.
    const insertQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status)
      OUTPUT 
        INSERTED.id, 
        INSERTED.estado,
        (SELECT p.order_number FROM RIP.APP_PEDIDOS p WHERE p.id = INSERTED.order_id) as orderNumber,
        (SELECT c.name FROM RIP.VW_APP_CLIENTES c JOIN RIP.APP_PEDIDOS p ON p.customer_id = c.id WHERE p.id = INSERTED.order_id) as client_name,
        (SELECT t.placa FROM RIP.APP_CAMIONES t WHERE t.id = INSERTED.truck_id) as placa,
        (SELECT dr.name FROM RIP.APP_CHOFERES dr WHERE dr.id = INSERTED.driver_id) as driver_name
      VALUES (@orderId, @truckId, @driverId, 'PENDING');
    `;

    const params = [
        { name: 'orderId', type: TYPES.Int, value: orderId },
        { name: 'truckId', type: TYPES.Int, value: truckId },
        { name: 'driverId', type: TYPES.Int, value: driverId },
    ];
    
    const result = await executeQuery(insertQuery, params);
    const newDeliveryData = result[0];

    // Formateamos la respuesta para que coincida con la estructura del frontend.
    const responsePayload = {
        id: newDeliveryData.id,
        estado: newDeliveryData.estado,
        order: {
            orderNumber: newDeliveryData.orderNumber,
            client: { name: newDeliveryData.client_name },
            items: []
        },
        truck: { placa: newDeliveryData.placa },
        driver: { name: newDeliveryData.driver_name }
    };
    
    revalidateTag("deliveries");

    return NextResponse.json(responsePayload, { status: 201 });

  } catch (e) {
    if (e instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(e.errors), { status: 400 });
    }
    console.error("[API_DELIVERIES_POST]", e);
    return new NextResponse("Error al crear el despacho", { status: 500 });
  }
}