import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { Delivery } from "@/lib/types";

export const dynamic = "force-dynamic";

// --- GET: Obtener todos los despachos ---
export async function GET() {
  try {
    const query = `
        SELECT
            d.id as delivery_id, 
            d.status as estado, 
            d.notes, 
            d.load_photo_url as loadPhoto,
            p.id as order_id, 
            p.order_number,
            p.customer_id,
            p.status as order_status,
            p.created_at as order_created_at,
            c.id as client_id, 
            c.name as client_name,
            t.id as truck_id, 
            t.placa,
            dr.id as driver_id, 
            dr.name as driver_name, 
            dr.phone as driver_phone,
            pi.id as pedido_item_id, 
            pi.product_id,
            pi.quantity as cantidadSolicitada, 
            pi.price_per_unit,
            pi.unit,
            prod.id as product_id_from_prod, 
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

    const deliveriesMap = new Map<string, Delivery>();
    for (const row of rows) {
        if (!deliveriesMap.has(row.delivery_id)) {
            deliveriesMap.set(row.delivery_id, {
                delivery_id: row.delivery_id,
                estado: row.estado,
                notes: row.notes,
                loadPhoto: row.loadPhoto,
                order: {
                    id: row.order_id,
                    order_number: row.order_number,
                    customer_id: row.customer_id,
                    status: row.order_status,
                    created_at: row.order_created_at,
                    client: { id: row.client_id, name: row.client_name },
                    items: [],
                },
                truck: { id: row.truck_id, placa: row.placa },
                driver: { id: row.driver_id, name: row.driver_name, phone: row.driver_phone },
            });
        }
        
        const delivery = deliveriesMap.get(row.delivery_id)!;
        if (row.pedido_item_id) {
            delivery.order.items.push({
                id: row.pedido_item_id,
                order_id: row.order_id,
                product_id: row.product_id,
                quantity: row.cantidadSolicitada,
                price_per_unit: row.price_per_unit,
                unit: row.unit,
                product: {
                    id: row.product_id_from_prod,
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

// --- POST: Crear un nuevo despacho ---
const createDeliverySchema = z.object({
  orderId: z.number().int().positive(),
  truckId: z.number().int().positive(),
  driverId: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, truckId, driverId } = createDeliverySchema.parse(body);

    const insertQuery = `
      INSERT INTO RIP.APP_DESPACHOS (order_id, truck_id, driver_id, status)
      OUTPUT 
        INSERTED.id, 
        INSERTED.status as estado,
        (SELECT p.order_number FROM RIP.APP_PEDIDOS p WHERE p.id = INSERTED.order_id) as orderNumber,
        (SELECT c.name FROM RIP.VW_APP_CLIENTES c JOIN RIP.APP_PEDIDOS p ON p.customer_id = c.id WHERE p.id = INSERTED.order_id) as client_name,
        (SELECT t.placa FROM RIP.APP_CAMIONES t WHERE t.id = INSERTED.truck_id) as placa,
        (SELECT dr.name FROM RIP.APP_CHOFERES dr WHERE dr.id = INSERTED.driver_id) as driver_name
      VALUES (@orderId, @truckId, @driverId, 'PENDIENTE');
    `;

    const params = [
        { name: 'orderId', type: TYPES.Int, value: orderId },
        { name: 'truckId', type: TYPES.Int, value: truckId },
        { name: 'driverId', type: TYPES.Int, value: driverId },
    ];
    
    const result = await executeQuery(insertQuery, params);
    const newDeliveryData = result[0];

    const responsePayload = {
        id: newDeliveryData.id,
        delivery_id: newDeliveryData.id,
        estado: newDeliveryData.estado,
        order: {
            order_number: newDeliveryData.orderNumber, // Corregido para consistencia
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