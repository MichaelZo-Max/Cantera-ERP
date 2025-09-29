// app/api/cashier-orders/[id]/route.ts

import { executeQuery, TYPES } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("--- INICIANDO PROCESO DE FACTURACIÓN DE ORDEN DE CAJA ---");
  try {
    const { invoiceId } = await req.json();
    const cashierOrderId = params.id;

    console.log(`Paso 1: Recibido cashierOrderId: ${cashierOrderId} y invoiceId: ${invoiceId}`);

    if (!invoiceId) {
      console.error("Error: El ID de la factura es requerido.");
      return NextResponse.json(
        { message: "El ID de la factura es requerido" },
        { status: 400 }
      );
    }

    // --- PRIMERA ACTUALIZACIÓN: Marcar la orden de caja como facturada ---
    const updateCashierOrderQuery = `
      UPDATE RIP.APP_ORDENES_SIN_FACTURA_CAB
      SET
        status = 'INVOICED',
        related_invoice_n = @invoiceId
      OUTPUT INSERTED.id
      WHERE id = @cashierOrderId
    `;

    const cashierUpdateResult = await executeQuery(
      updateCashierOrderQuery,
      [
        { name: "invoiceId", type: TYPES.NVarChar, value: invoiceId },
        { name: "cashierOrderId", type: TYPES.Int, value: parseInt(cashierOrderId) },
      ]
    );

    if (cashierUpdateResult.length > 0) {
        console.log(`Paso 2: Éxito. La orden de caja con id=${cashierUpdateResult[0].id} fue actualizada a 'INVOICED'.`);
    } else {
        console.warn(`Paso 2: Advertencia. No se encontró o no se pudo actualizar la orden de caja con id=${cashierOrderId}.`);
    }


    // --- SEGUNDA ACTUALIZACIÓN: Marcar el pedido principal como facturado ---
    console.log(`Paso 3: Intentando actualizar el pedido principal donde cashier_order_id = ${cashierOrderId} y status = 'PENDING_INVOICE'.`);

    const updateMainOrderQuery = `
        UPDATE RIP.APP_PEDIDOS 
        SET status = 'INVOICED'
        OUTPUT INSERTED.id
        WHERE cashier_order_id = @cashierOrderId
        AND status = 'PENDING_INVOICE'
    `;

    const mainOrderUpdateResult = await executeQuery(updateMainOrderQuery, [
      { name: "cashierOrderId", type: TYPES.Int, value: parseInt(cashierOrderId) },
    ]);

    if (mainOrderUpdateResult.length > 0) {
        console.log(`Paso 4: ÉXITO DEFINITIVO. El pedido principal con id=${mainOrderUpdateResult[0].id} fue actualizado a 'INVOICED'.`);
    } else {
        console.error("Paso 4: FALLO CRÍTICO. La consulta para actualizar el pedido principal no afectó a ninguna fila. Verifique los datos y la consulta.");
    }

    console.log("--- PROCESO FINALIZADO ---");
    return NextResponse.json({
      message: "Proceso de actualización completado.",
    });
  } catch (error) {
    console.error("--- ERROR INESPERADO EN EL PROCESO ---", error);
    return NextResponse.json(
      {
        message: "Error interno del servidor",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}