import { NextResponse } from 'next/server';
import { mockDeliveries, mockOrders, mockClients, mockTrucks } from '@/lib/mock-data';

/**
 * @route   GET /api/deliveries
 * @desc    Obtener todos los despachos con datos anidados
 */
export async function GET() {
  const populatedDeliveries = mockDeliveries.map(d => {
    const order = mockOrders.find(o => o.id === d.orderId);
    return {
      ...d,
      order: {
        ...order,
        client: mockClients.find(c => c.id === order?.clientId),
      },
      truck: mockTrucks.find(t => t.id === d.truckId),
      // Simular productFormat
      productFormat: {
          product: { nombre: 'Material Genérico' },
          sku: 'A granel (m³)',
          unidadBase: 'M3',
      }
    }
  });
  return NextResponse.json(populatedDeliveries);
}