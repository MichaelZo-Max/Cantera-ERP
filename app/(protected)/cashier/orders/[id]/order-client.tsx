"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuantityInput } from "@/components/forms/quantity-input";
import { Plus, Trash2, Calculator, CreditCard, ShoppingCart, Truck, User, Package, ListOrdered, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Client, Product, UnitBase, Destination, Truck as TruckType, Driver, Order, Invoice } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

interface Catalogs {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: TruckType[];
  drivers: Driver[];
  invoices: Invoice[];
}

interface OrderClientProps {
  isEditing: boolean;
  initialOrderData: Order | null;
  catalogs: Catalogs;
}

export function OrderClient({ isEditing, initialOrderData, catalogs }: OrderClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados del formulario ---
  const [selectedcustomer_id, setSelectedcustomer_id] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>();
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [selectedInvoice, setSelectedInvoice] = useState<string | undefined>();

  // Efecto para inicializar el estado del formulario cuando se edita
  useEffect(() => {
    if (isEditing && initialOrderData) {
      setSelectedcustomer_id(String(initialOrderData.customer_id ?? ""));
      setSelectedDestinationId(initialOrderData.destination_id?.toString() ?? undefined);
      
      // ✨ CORRECCIÓN: Usar las propiedades correctas devueltas por tu API
      setSelectedTruckIds(initialOrderData.trucks?.map((t: TruckType) => t.id.toString()) ?? []);
      setSelectedDriverIds(initialOrderData.drivers?.map((d: Driver) => d.id.toString()) ?? []);
      
      setOrderItems(initialOrderData.items?.map(item => ({
        id: crypto.randomUUID(),
        product: item.product!,
        quantity: item.quantity,
        pricePerUnit: Number(item.price_per_unit),
        subtotal: Number(item.quantity) * Number(item.price_per_unit),
      })) ?? []);
      if (
        initialOrderData.invoice_series &&
        initialOrderData.invoice_number !== null && 
        typeof initialOrderData.invoice_number !== 'undefined'
      ) {
        const invoiceValue = `${initialOrderData.invoice_series}|${initialOrderData.invoice_number}|${initialOrderData.invoice_n}`;
        setSelectedInvoice(invoiceValue);
      }
    }
  }, [isEditing, initialOrderData]);

  // --- Lógica de cálculo y manipulación ---
  const filteredDestinations = useMemo(() => {
    if (!selectedcustomer_id) return [];
    return catalogs.destinations.filter(d => d.customer_id.toString() === selectedcustomer_id);
  }, [selectedcustomer_id, catalogs.destinations]);

  const total = useMemo(() => orderItems.reduce((sum, item) => sum + item.subtotal, 0), [orderItems]);

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || currentQuantity <= 0) {
      toast.error("Selecciona un producto y una cantidad válida.");
      return;
    }
    const price = Number(selectedProduct.price_per_unit ?? 0);
    setOrderItems(prev => [...prev, {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: currentQuantity,
      pricePerUnit: price,
      subtotal: currentQuantity * price,
    }]);
    setSelectedProduct(null);
    setCurrentQuantity(0);
    toast.success(`${selectedProduct.name} agregado al pedido.`);
  }, [selectedProduct, currentQuantity]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
    toast.info("Item eliminado del pedido.");
  }, []);

  const handleProductSelect = useCallback((productId: string) => {
    const product = catalogs.products.find(p => p.id.toString() === productId);
    setSelectedProduct(product || null);
    setCurrentQuantity(product ? 1 : 0);
  }, [catalogs.products]);

  // --- Lógica de envío ---
  const handleSubmit = useCallback(async () => {
    if (!selectedcustomer_id || orderItems.length === 0 || selectedTruckIds.length === 0 || selectedDriverIds.length === 0) {
      toast.error("Completa todos los campos: Cliente, al menos un producto, un camión y un chofer.");
      return;
    }

    setIsSubmitting(true);

    let invoiceData = {};
    if (selectedInvoice) {
        const [series, number, n] = selectedInvoice.split('|');
        invoiceData = {
            invoice_series: series,
            invoice_number: parseInt(number, 10),
            invoice_n: parseInt(n, 10),
        };
    }

    const orderData = {
      customer_id: parseInt(selectedcustomer_id, 10),
      destination_id: selectedDestinationId ? parseInt(selectedDestinationId, 10) : null,
      items: orderItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
        unit: item.product.unit || "UNIDAD",
      })),
      total: total,
      truck_ids: selectedTruckIds.map(id => parseInt(id, 10)),
      driver_ids: selectedDriverIds.map(id => parseInt(id, 10)),
      ...invoiceData,
    };

    const url = isEditing ? `/api/orders/${initialOrderData?.id}` : "/api/orders";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error del servidor.");
      }

      const result = await res.json();
      toast.success(`Pedido #${result.order_number || initialOrderData?.order_number} ${isEditing ? 'actualizado' : 'creado'} con éxito.`);
      router.push("/cashier/orders/list");
      router.refresh();
    } catch (err: any) {
      toast.error(`Error al ${isEditing ? 'actualizar' : 'crear'} el pedido`, { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditing, initialOrderData, selectedcustomer_id, selectedDestinationId, orderItems, total, selectedTruckIds, selectedDriverIds, router, selectedInvoice ]);
  
  const canSubmit = useMemo(() => (
    !!selectedcustomer_id && orderItems.length > 0 && selectedTruckIds.length > 0 && selectedDriverIds.length > 0
  ), [selectedcustomer_id, orderItems, selectedTruckIds, selectedDriverIds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-3 space-y-6">
                <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart />Datos Generales</CardTitle></CardHeader>
          <CardContent>
             <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <SearchableSelect
                    value={selectedcustomer_id}
                    onChange={(value) => {
                      setSelectedcustomer_id(value);
                      setSelectedDestinationId(undefined);
                      setSelectedInvoice(undefined); // Limpia la factura al cambiar de cliente
                    }}
                    placeholder="Selecciona un cliente..."
                    options={catalogs.clients.map(client => ({ value: client.id.toString(), label: client.name }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino (Opcional)</Label>
                  <SearchableSelect
                    value={selectedDestinationId}
                    onChange={setSelectedDestinationId}
                    placeholder="Selecciona un destino..."
                    disabled={!selectedcustomer_id || filteredDestinations.length === 0}
                    options={filteredDestinations.map(dest => ({ value: dest.id.toString(), label: dest.name }))}
                  />
                </div>
             </div>
            {/* --- 👇 NUEVO CAMPO PARA VINCULAR FACTURA --- */}
            <div className="mt-4 space-y-2">
              <Label className="flex items-center gap-2"><FileText size={16}/> Vincular Factura (Opcional)</Label>
              <SearchableSelect
                value={selectedInvoice}
                onChange={setSelectedInvoice}
                placeholder="Selecciona una factura disponible..."
                disabled={!selectedcustomer_id}
                options={catalogs.invoices
                  // Filtra facturas para que coincidan con el cliente seleccionado
                  .filter(inv => inv.customer_name === catalogs.clients.find(c => c.id.toString() === selectedcustomer_id)?.name)
                  .map(inv => ({
                    // Usamos un separador para crear un valor único
                    value: `${inv.invoice_series}|${inv.invoice_number}|${inv.invoice_n}`,
                    label: `Factura ${inv.invoice_series}-${inv.invoice_number} ($${inv.total_usd.toFixed(2)})`,
                  }))}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transporte</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Camiones *</Label>
                <SearchableSelect
                  isMulti
                  value={selectedTruckIds}
                  onChange={setSelectedTruckIds}
                  placeholder="Selecciona camiones..."
                  options={catalogs.trucks.map(truck => ({ value: truck.id.toString(), label: `${truck.placa} (${truck.brand || 'N/A'})` }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Choferes *</Label>
                <SearchableSelect
                  isMulti
                  value={selectedDriverIds}
                  onChange={setSelectedDriverIds}
                  placeholder="Selecciona choferes..."
                  options={catalogs.drivers.map(driver => ({ value: driver.id.toString(), label: driver.name }))}
                />
              </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader><CardTitle>Constructor de Items</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <SearchableSelect
                    value={selectedProduct?.id.toString() || ""}
                    onChange={handleProductSelect}
                    placeholder="Seleccionar producto..."
                    options={catalogs.products.map(product => ({
                      value: product.id.toString(),
                      label: `${product.name} ($${Number(product.price_per_unit).toFixed(2)})`
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <QuantityInput
                    unitBase={(selectedProduct?.unit as UnitBase) || "M3"}
                    value={currentQuantity}
                    onChange={setCurrentQuantity}
                    disabled={!selectedProduct}
                  />
                </div>
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProduct || currentQuantity <= 0} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Agregar Item
              </Button>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2 space-y-6 lg:sticky top-24">
        <Card>
          <CardHeader><CardTitle>Resumen del Pedido</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center font-bold text-2xl border-t pt-4">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <GradientButton onClick={handleSubmit} disabled={!canSubmit || isSubmitting} size="lg" className="w-full">
              <CreditCard className="h-5 w-5 mr-2" />
              {isSubmitting ? "Procesando..." : isEditing ? "Actualizar Pedido" : "Crear Pedido"}
            </GradientButton>
          </CardContent>
        </Card>
        {orderItems.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Items del Pedido</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity} {item.product.unit} x ${item.pricePerUnit.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Pedido Vacío" description="Añade productos para empezar." icon={<ShoppingCart />} />
        )}
      </div>
    </div>
  );
}