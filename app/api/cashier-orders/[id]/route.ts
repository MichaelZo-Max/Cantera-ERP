// app/api/cashier-orders/[id]/route.ts

import { executeQuery, TYPES } from "@/lib/db"; // 1. Importa TYPES
import { NextResponse } from "next/server";

// Handler para actualizar la orden (marcar como facturada)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { invoiceId } = await req.json();
    const orderId = params.id;

    if (!invoiceId) {
      return NextResponse.json(
        { message: "El ID de la factura es requerido" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE RIP.APP_ORDENES_SIN_FACTURA_CAB
      SET
        status = 'INVOICED',
        related_invoice_id = @invoiceId
      WHERE id = @orderId
    `;

    // 2. Agrega el tipo a cada parámetro
    await executeQuery(query, [
        { name: 'invoiceId', type: TYPES.NVarChar, value: invoiceId },
        { name: 'orderId', type: TYPES.Int, value: parseInt(orderId) }
    ]);

    return NextResponse.json({ message: "Orden actualizada exitosamente" });

  } catch (error) {
    console.error("Error updating cashier order:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}