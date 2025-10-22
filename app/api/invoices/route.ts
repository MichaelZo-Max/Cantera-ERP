import { NextRequest, NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // --- CORRECCIÓN #1: Usar 'customerId' en lugar de 'customerName' ---
    const customerId = searchParams.get("customerId");

    const offset = (page - 1) * pageSize;

    const params: { name: string; type: any; value: any }[] = [];
    let whereClause = "";

    // --- CORRECCIÓN #2: Construir la cláusula WHERE con 'customer_id' ---
    if (customerId) {
      // Asume que la columna en tu vista se llama 'customer_id'.
      // Si se llama diferente (ej. 'customer_code'), ajústalo aquí.
      whereClause = "WHERE customer_id = @customerId";
      params.push({
        name: "customerId",
        type: TYPES.NVarChar, // O TYPES.Int si el ID es numérico
        value: customerId,
      });
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM RIP.VW_APP_FACTURAS_DISPONIBLES
      ${whereClause}
    `;

    const totalResult: { total: number }[] = await executeQuery(
      countQuery,
      params
    );
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    const totalPages = Math.ceil(total / pageSize);

    const query = `
     SELECT DISTINCT
        FD.invoice_series,
        FD.invoice_number,
        FD.invoice_n,
        customer_name,
        invoice_date,
        SUM(price_per_unit * quantity_pending) AS total_usd,
        (FD.invoice_series + '-' + CAST(FD.invoice_number AS NVARCHAR(20))) as invoice_full_number
      FROM RIP.VW_APP_FACTURAS_DISPONIBLES AS FD
      INNER JOIN RIP.VW_APP_FACTURA_ITEMS_PENDIENTES AS FIP ON FIP.invoice_number = FD.invoice_number AND FIP.invoice_series = FD.invoice_series
      ${whereClause} -- Se asegura que el filtro del cliente se aplique aquí
        AND NOT EXISTS (
      SELECT *
      FROM RIP.APP_PEDIDOS_FACTURAS AS P
      WHERE P.invoice_series = FD.invoice_series 
      AND P.invoice_number = FD.invoice_number
        )
        GROUP BY FD.invoice_series,FD.invoice_number,FD.invoice_n,customer_name,invoice_date
      ORDER BY invoice_date DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `;

    const queryParams = [
      ...params,
      { name: "offset", type: TYPES.Int, value: offset },
      { name: "pageSize", type: TYPES.Int, value: pageSize },
    ];

    const invoices = await executeQuery(query, queryParams);

    // --- CORRECCIÓN #3: Devolver un objeto con la propiedad 'data' ---
    return NextResponse.json({
      data: invoices, // El frontend espera 'data'
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return new NextResponse(
      JSON.stringify({ message: "Error al obtener las facturas" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
