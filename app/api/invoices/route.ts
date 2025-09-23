import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, TYPES } from '@/lib/db'; // Importa TYPES

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const customerName = searchParams.get('customerName');

    const offset = (page - 1) * pageSize;

    const params: { name: string; type: any; value: any }[] = [];
    let whereClause = '';

    if (customerName) {
      whereClause = 'WHERE customer_name = @customerName';
      params.push({
        name: 'customerName',
        type: TYPES.NVarChar,
        value: customerName,
      });
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM RIP.VW_APP_FACTURAS_DISPONIBLES
      ${whereClause}
    `;

    const totalResult: { total: number }[] = await executeQuery(countQuery, params);
    const total = totalResult[0].total;

    const totalPages = Math.ceil(total / pageSize);

    // Usamos OFFSET y FETCH NEXT para paginación en SQL Server
    const query = `
      SELECT
        invoice_series,
        invoice_number,
        invoice_n,
        customer_name,
        invoice_date,
        total_usd
      FROM RIP.VW_APP_FACTURAS_DISPONIBLES
      ${whereClause}
      ORDER BY invoice_date DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `;

    const queryParams = [
      ...params,
      { name: 'offset', type: TYPES.Int, value: offset },
      { name: 'pageSize', type: TYPES.Int, value: pageSize },
    ];

    const invoices = await executeQuery(query, queryParams);

    return NextResponse.json({
      invoices,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error al obtener las facturas' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}