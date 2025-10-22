// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { orderUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 });
    }

    // --- 👇 CAMBIO: Usar la vista VW_APP_PEDIDOS que ya tiene las facturas en JSON ---
    const orderQuery = `
      SELECT
          p.id, p.order_number, p.status, p.created_at, p.notes,
          p.customer_id, p.destination_id,
          c.name AS client_name, c.rfc,
          d.name AS destino_name,
          vp.invoices -- Obtenemos el string JSON de facturas desde la vista
      FROM RIP.APP_PEDIDOS p
      JOIN RIP.VW_APP_CLIENTES c ON c.id = p.customer_id
      LEFT JOIN RIP.APP_DESTINOS d ON d.id = p.destination_id
      LEFT JOIN RIP.VW_APP_PEDIDOS vp ON vp.id = p.id -- Unimos con la vista para obtener las facturas
      WHERE p.id = @id;
    `;
    const orderResult = await executeQuery(orderQuery, [
      { name: "id", type: TYPES.Int, value: id },
    ]);

    if (orderResult.length === 0) {
      return new NextResponse("Pedido no encontrado", { status: 404 });
    }

    const order = orderResult[0];
    // Parseamos el string JSON de facturas para convertirlo en un array
    order.invoices =
      typeof order.invoices === "string" ? JSON.parse(order.invoices) : [];

    // 2. Obtener los items (sin cambios)
    const itemsQuery = `
      SELECT i.id, i.quantity, i.price_per_unit, i.unit, prod.id as product_id,
             prod.name AS product_name, prod.unit as product_unit
      FROM RIP.APP_PEDIDOS_ITEMS i
      JOIN RIP.VW_APP_PRODUCTOS prod ON prod.id = i.product_id
      WHERE i.order_id = @id;
    `;
    const itemsResult = await executeQuery(itemsQuery, [
      { name: "id", type: TYPES.Int, value: id },
    ]);

    // 3. Obtener los camiones (sin cambios)
    const trucksQuery = `
      SELECT t.id, t.placa, t.brand, t.model FROM RIP.APP_PEDIDOS_CAMIONES pc
      JOIN RIP.APP_CAMIONES t ON t.id = pc.camion_id WHERE pc.pedido_id = @id;
    `;
    const trucksResult = await executeQuery(trucksQuery, [
      { name: "id", type: TYPES.Int, value: id },
    ]);

    // 4. Obtener los choferes (sin cambios)
    const driversQuery = `
      SELECT c.id, c.name, c.docId FROM RIP.APP_PEDIDOS_CHOFERES pch
      JOIN RIP.APP_CHOFERES c ON c.id = pch.chofer_id WHERE pch.pedido_id = @id;
    `;
    const driversResult = await executeQuery(driversQuery, [
      { name: "id", type: TYPES.Int, value: id },
    ]);

    // Construimos la respuesta final asegurándonos de que las propiedades anidadas
    // 'client' y 'destination' coincidan con la interfaz 'Order'.
    const finalResponse: typeof order & {
      client: any;
      destination?: any;
      items: any[];
      trucks: any[];
      drivers: any[];
    } = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      notes: order.notes,
      customer_id: order.customer_id,
      client: {
        // Construimos el objeto client
        id: order.customer_id,
        name: order.client_name,
        rif: order.rfc, // Mapeamos rfc a rif según la interfaz Client
      },
      destination_id: order.destination_id,
      destination: order.destination_id
        ? {
            // Construimos el objeto destination si existe
            id: order.destination_id,
            name: order.destino_name,
          }
        : undefined,
      invoices: order.invoices, // Ya está parseado
      items: itemsResult.map((item: any) => ({
        // Mapeamos los items
        id: item.id,
        quantity: Number(item.quantity),
        price_per_unit: Number(item.price_per_unit),
        unit: item.unit,
        product: {
          id: item.product_id,
          name: item.product_name,
          unit: item.product_unit,
        },
      })),
      trucks: trucksResult, // Incluimos los camiones
      drivers: driversResult, // Incluimos los choferes
    }; // Aseguramos que el tipo sea compatible

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error(`[API_ORDERS_ID_GET]`, error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

/**
 * @route   PUT /api/orders/[id]
 * @desc    Actualizar un pedido completo (datos, items, facturas, camiones y choferes)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (isNaN(id)) {
      return new NextResponse("ID de pedido inválido", { status: 400 });
    }

    // --- INICIO DE LA NUEVA LÓGICA DE VALIDACIÓN ---
    // Verificamos si la orden ya tiene despachos antes de hacer cualquier otra cosa.
    const checkDispatchesQuery = `
      SELECT COUNT(*) as dispatchCount 
      FROM RIP.APP_DESPACHOS 
      WHERE order_id = @id;
    `;
    const result = await executeQuery(checkDispatchesQuery, [
      { name: "id", type: TYPES.Int, value: id },
    ]);

    if (result && result[0]?.dispatchCount > 0) {
      return new NextResponse(
        "Este pedido no se puede editar porque ya tiene despachos asociados.",
        { status: 403 } // 403 Forbidden es el código adecuado
      );
    }
    // --- FIN DE LA NUEVA LÓGICA DE VALIDACIÓN ---

    const body = await request.json();
    const validation = orderUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 });
    }

    const {
      items: itemsFromClient,
      truck_ids,
      driver_ids,
      invoices,
      ...orderData
    } = validation.data;

    // --- 👇 LÓGICA DE SEGURIDAD PARA OBTENER ITEMS CONFIABLES ---
    let trustedItems: typeof itemsFromClient = [];

    if (invoices && invoices.length > 0) {
      const invoiceParams = invoices.flatMap((inv, index) => [
        {
          name: `series_${index}`,
          type: TYPES.NVarChar,
          value: inv.invoice_series,
        },
        { name: `number_${index}`, type: TYPES.Int, value: inv.invoice_number },
        { name: `n_${index}`, type: TYPES.NVarChar, value: inv.invoice_n },
      ]);

      const conditions = invoices
        .map(
          (_, index) =>
            `(invoice_series = @series_${index} AND invoice_number = @number_${index} AND invoice_n = @n_${index})`
        )
        .join(" OR ");

      const itemsQuery = `
        SELECT
            product_id AS id,
            product_name AS name,
            product_code AS code,
            price_per_unit,
            unit,
            quantity_pending AS available_quantity
        FROM 
            RIP.VW_APP_FACTURA_ITEMS_PENDIENTES
        WHERE 
            ${conditions};
      `;

      const productsFromInvoices = await executeQuery(
        itemsQuery,
        invoiceParams
      );

      trustedItems = productsFromInvoices.map((p: any) => ({
        product_id: p.id,
        quantity: p.available_quantity,
        price_per_unit: p.price_per_unit ?? 0,
        unit: p.unit || "UNIDAD",
      }));
    } else {
      trustedItems = itemsFromClient;
    }

    if (trustedItems.length === 0) {
      return NextResponse.json(
        { error: "El pedido debe tener al menos un producto." },
        { status: 400 }
      );
    }
    // --- FIN DE LA LÓGICA DE SEGURIDAD ---

    // --- 👇 CORRECCIÓN: Determinar el nuevo estado del pedido ---
    // Si se proporcionan facturas, el estado debe ser 'INVOICED'.
    // De lo contrario, se mantiene como 'PENDING_INVOICE'.
    const newStatus = invoices && invoices.length > 0 ? "INVOICED" : "PENDING_INVOICE";

    // ===== INICIO DE LA TRANSACCIÓN EN LA BASE DE DATOS =====
    const updateOrderQuery = `
      UPDATE RIP.APP_PEDIDOS
      SET customer_id = @customer_id, 
          destination_id = @destination_id,
          status = @status, -- Actualizamos el estado
          updated_at = GETDATE()
      WHERE id = @id;
    `;
    await executeQuery(updateOrderQuery, [
      { name: "id", type: TYPES.Int, value: id },
      { name: "customer_id", type: TYPES.Int, value: orderData.customer_id },
      {
        name: "destination_id",
        type: TYPES.Int,
        value: orderData.destination_id,
      },
      { name: "status", type: TYPES.NVarChar, value: newStatus }, // Pasamos el nuevo estado como parámetro
    ]);

    // 1. Actualizar Items
    await executeQuery(
      `DELETE FROM RIP.APP_PEDIDOS_ITEMS WHERE order_id = @id`,
      [{ name: "id", type: TYPES.Int, value: id }]
    );
    for (const item of trustedItems) {
      const insertItemQuery = `
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
        VALUES (@order_id, @product_id, @quantity, @price_per_unit, @unit);
      `;
      await executeQuery(insertItemQuery, [
        { name: "order_id", type: TYPES.Int, value: id },
        { name: "product_id", type: TYPES.Int, value: item.product_id },
        { name: "quantity", type: TYPES.Decimal, value: item.quantity },
        {
          name: "price_per_unit",
          type: TYPES.Decimal,
          value: item.price_per_unit,
        },
        { name: "unit", type: TYPES.NVarChar, value: item.unit },
      ]);
    }

    // 2. Actualizar Facturas
    await executeQuery(
      `DELETE FROM RIP.APP_PEDIDOS_FACTURAS WHERE pedido_id = @id`,
      [{ name: "id", type: TYPES.Int, value: id }]
    );
    if (invoices && Array.isArray(invoices)) {
      for (const invoice of invoices) {
        const insertInvoiceQuery = `
          INSERT INTO RIP.APP_PEDIDOS_FACTURAS (pedido_id, invoice_series, invoice_number, invoice_n)
          VALUES (@pedido_id, @invoice_series, @invoice_number, @invoice_n);
        `;
        await executeQuery(insertInvoiceQuery, [
          { name: "pedido_id", type: TYPES.Int, value: id },
          {
            name: "invoice_series",
            type: TYPES.NVarChar,
            value: invoice.invoice_series,
          },
          {
            name: "invoice_number",
            type: TYPES.Int,
            value: invoice.invoice_number,
          },
          { name: "invoice_n", type: TYPES.NVarChar, value: invoice.invoice_n },
        ]);
      }
    }

    // 3. Actualizar Camiones
    await executeQuery(
      `DELETE FROM RIP.APP_PEDIDOS_CAMIONES WHERE pedido_id = @id`,
      [{ name: "id", type: TYPES.Int, value: id }]
    );
    for (const truckId of truck_ids) {
      const insertTruckQuery = `INSERT INTO RIP.APP_PEDIDOS_CAMIONES (pedido_id, camion_id) VALUES (@pedido_id, @camion_id);`;
      await executeQuery(insertTruckQuery, [
        { name: "pedido_id", type: TYPES.Int, value: id },
        { name: "camion_id", type: TYPES.Int, value: truckId },
      ]);
    }

    // 4. Actualizar Choferes
    await executeQuery(
      `DELETE FROM RIP.APP_PEDIDOS_CHOFERES WHERE pedido_id = @id`,
      [{ name: "id", type: TYPES.Int, value: id }]
    );
    for (const driverId of driver_ids) {
      const insertDriverQuery = `INSERT INTO RIP.APP_PEDIDOS_CHOFERES (pedido_id, chofer_id) VALUES (@pedido_id, @chofer_id);`;
      await executeQuery(insertDriverQuery, [
        { name: "pedido_id", type: TYPES.Int, value: id },
        { name: "chofer_id", type: TYPES.Int, value: driverId },
      ]);
    }

    revalidateTag("orders");

    const getOrderNumberSql = `SELECT order_number FROM RIP.APP_PEDIDOS WHERE id = @id;`;
    const orderResult = await executeQuery(getOrderNumberSql, [
      { name: "id", type: TYPES.Int, value: id },
    ]);
    const order_number = orderResult[0]?.order_number;

    return NextResponse.json({
      message: "Pedido actualizado correctamente",
      id: id,
      order_number: order_number,
    });
  } catch (error) {
    console.error(`[API_ORDERS_ID_PUT]`, error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
