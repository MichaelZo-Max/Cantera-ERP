// app/api/cashier-orders/[id]/route.ts

import { executeQuery, TYPES } from "@/lib/db";
import { NextResponse } from "next/server";

// --- Interfaces y funciones de ayuda (sin cambios) ---
interface GroupedProduct {
  product_id: number;
  total_quantity: number;
}

const compareOrderAndInvoiceItems = (
  orderItems: GroupedProduct[],
  invoiceItems: GroupedProduct[]
): boolean => {
  if (orderItems.length !== invoiceItems.length) {
    console.error("Error de validación: El número de líneas de producto no coincide.");
    return false;
  }
  const orderItemsMap = new Map(orderItems.map((item) => [item.product_id, item.total_quantity]));
  for (const invoiceItem of invoiceItems) {
    const orderQuantity = orderItemsMap.get(invoiceItem.product_id);
    if (orderQuantity === undefined) {
      console.error(`Error de validación: El producto con ID ${invoiceItem.product_id} existe en la factura pero no en la orden.`);
      return false;
    }
    if (Math.abs(orderQuantity - invoiceItem.total_quantity) > 0.001) {
      console.error(`Error de validación: La cantidad para el producto ID ${invoiceItem.product_id} no coincide (Orden: ${orderQuantity}, Factura: ${invoiceItem.total_quantity}).`);
      return false;
    }
  }
  return true;
};

const parseInvoiceId = (id: string) => {
    const lastDashIndex = id.lastIndexOf('-');
    if (lastDashIndex === -1) return null;
    const series = id.substring(0, lastDashIndex);
    const numberAndN = id.substring(lastDashIndex + 1);
    const match = numberAndN.match(/^(\d+)([a-zA-Z]?)$/);
    if (!match) return null;
    const number = parseInt(match[1], 10);
    const n = match[2] || ' ';
    if (isNaN(number)) return null;
    return { series, number, n };
};


export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("--- INICIANDO PROCESO DE FACTURACIÓN (VÍA STORED PROCEDURE) ---");
  const cashierOrderId = parseInt(params.id, 10);

  try {
    const { invoiceIds } = await req.json();
    console.log(`Paso 1: Recibido cashierOrderId: ${cashierOrderId}, invoiceIds:`, invoiceIds);

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ message: "Se requiere un array con al menos un ID de factura." }, { status: 400 });
    }

    // Convertimos el array de JS a un string en formato JSON para SQL Server
    const invoiceIdsJson = JSON.stringify(invoiceIds);

    // Definimos la consulta para ejecutar el Stored Procedure
    const query = `
      EXEC RIP.SP_InvoiceCashierOrder 
        @CashierOrderId = @OrderId, 
        @InvoiceIdsJson = @JsonPayload;
    `;

    // Ejecutamos el procedimiento
    await executeQuery(query, [
      { name: "OrderId", type: TYPES.Int, value: cashierOrderId },
      { name: "JsonPayload", type: TYPES.NVarChar, value: invoiceIdsJson },
    ]);

    console.log("--- STORED PROCEDURE EJECUTADO EXITOSAMENTE ---");
    
    return NextResponse.json({
      message: "Proceso de facturación completado exitosamente.",
    });

  } catch (error: any) {
    console.error("--- ERROR AL EJECUTAR EL STORED PROCEDURE ---", error);

    // Los errores de validación lanzados con THROW en SQL llegarán aquí
    // en la propiedad `error.message`.
    return NextResponse.json(
      {
        message: error.message || "Error interno del servidor",
      },
      // Si el error viene de nuestra validación, es un Bad Request (400)
      { status: error.message.includes("Validación fallida") ? 400 : 500 }
    );
  }
}