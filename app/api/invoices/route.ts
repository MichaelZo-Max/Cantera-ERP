import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        invoice_series,
        invoice_number,
        invoice_n,
        customer_name,
        invoice_date,
        total_usd
      FROM RIP.VW_APP_FACTURAS_DISPONIBLES
      ORDER BY invoice_date DESC
    `;
    
    const invoices = await executeQuery(query);
    
    return NextResponse.json(invoices);
  } catch (error) {
    // Silence is gold
  }
}