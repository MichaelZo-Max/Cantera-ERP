// app/api/invoice-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const invoices: {
      invoice_series: string;
      invoice_number: number;
      invoice_n: string;
    }[] = await req.json();

    if (!invoices || invoices.length === 0) {
      return NextResponse.json([]);
    }

    const whereConditions = invoices
      .map(
        (_, index) => `
      (f.invoice_series = @series${index} AND f.invoice_number = @number${index} AND f.invoice_n = @n${index})
    `
      )
      .join(" OR ");

    const params: any[] = [];
    invoices.forEach((inv, index) => {
      params.push({
        name: `series${index}`,
        type: TYPES.NVarChar,
        value: inv.invoice_series,
      });
      params.push({
        name: `number${index}`,
        type: TYPES.Int,
        value: inv.invoice_number,
      });
      params.push({
        name: `n${index}`,
        type: TYPES.NChar,
        value: inv.invoice_n,
      });
    });

    const sql = `
      SELECT
        id,
        codigo,
        name,
        sell_format,
        AVG(price_per_unit_usd) as price_per_unit, -- Se usa el nombre correcto y se renombra para el frontend
        F.unit,
        is_active,
        fip.quantity_pending as available_quantity
      FROM RIP.VW_APP_FACTURA_ITEMS AS F
      INNER JOIN rip.VW_APP_FACTURA_ITEMS_PENDIENTES AS FIP ON FIP.invoice_number = F.invoice_number AND FIP.invoice_series = F.invoice_series and f.id = fip.product_id
      WHERE ${whereConditions}
           AND EXISTS (
        SELECT *
        FROM RIP.VW_APP_FACTURA_ITEMS_PENDIENTES AS FP
        WHERE 
            FP.invoice_number = F.invoice_number 
            AND FP.invoice_series = F.invoice_series
            and F.id = FP.product_id)
      GROUP BY
        id,
        codigo,
        name,
        sell_format,
        F.unit,
        is_active,
        fip.quantity_pending;
    `;

    const items = await executeQuery(sql, params);

    return NextResponse.json(items);
  } catch (error) {
    console.error("[API_INVOICE_ITEMS_POST]", error);
    return new NextResponse(
      "Error interno al obtener los items de las facturas",
      {
        status: 500,
      }
    );
  }
}
