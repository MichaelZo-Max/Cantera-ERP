// app/api/cashier-orders/[id]/route.ts

import { executeQuery, TYPES } from "@/lib/db";
import { NextResponse } from "next/server";

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

    const updateCashierOrderQuery = `
      UPDATE RIP.APP_ORDENES_SIN_FACTURA_CAB
      SET
        status = 'INVOICED',
        related_invoice_n = @invoiceId
      OUTPUT INSERTED.order_number 
      WHERE id = @orderId
    `;

    const cashierOrderResult: { order_number: string }[] = await executeQuery(
      updateCashierOrderQuery,
      [
        { name: "invoiceId", type: TYPES.NVarChar, value: invoiceId },
        { name: "orderId", type: TYPES.Int, value: parseInt(orderId) },
      ]
    );

    if (
      cashierOrderResult.length === 0 ||
      !cashierOrderResult[0].order_number
    ) {
      throw new Error("No se pudo encontrar o actualizar la orden de caja.");
    }

    const orderNumber = cashierOrderResult[0].order_number;

    // --- 👇 CORRECCIÓN AQUÍ ---
    // Cambiamos 'RIP.APP_PEDIDOS_CAB' por el nombre correcto 'RIP.APP_PEDIDOS'
    const updateMainOrderQuery = `
        UPDATE RIP.APP_PEDIDOS 
        SET status = 'INVOICED'
        WHERE order_number = @orderNumber 
        AND status = 'PENDING_INVOICE'
    `;

    await executeQuery(updateMainOrderQuery, [
      { name: "orderNumber", type: TYPES.NVarChar, value: orderNumber },
    ]);

    return NextResponse.json({
      message: "Orden actualizada y pedido marcado como pagado exitosamente",
    });
  } catch (error) {
    console.error("Error updating cashier/main order:", error);
    return NextResponse.json(
      {
        message: "Error interno del servidor",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
