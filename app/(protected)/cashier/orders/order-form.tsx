// app/(protected)/cashier/orders/order-form.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuantityInput } from "@/components/forms/quantity-input";
import {
  Plus,
  Trash2,
  Calculator,
  CreditCard,
  ShoppingCart,
  Truck,
  User,
  Package,
  ListOrdered,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Client,
  Product,
  UnitBase,
  Destination,
  Truck as TruckType,
  Driver,
  Order,
  Invoice,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

interface OrderFormProps {
  initialClients: Client[];
  initialProducts: Product[];
  initialDestinations: Destination[];
  initialTrucks: TruckType[];
  initialDrivers: Driver[];
  initialInvoices: Invoice[];
  isEditing?: boolean;
  initialOrderData?: Order | null;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function OrderForm({
  initialClients,
  initialProducts,
  initialDestinations,
  initialTrucks,
  initialDrivers,
  initialInvoices,
  isEditing = false,
  initialOrderData,
  onSubmit,
  isSubmitting,
}: OrderFormProps) {
  // 1. Inicializa los estados como vacíos o con valores por defecto.
  const [selectedcustomer_id, setSelectedcustomer_id] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>(undefined);
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [selectedInvoice, setSelectedInvoice] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Verifica que estemos en modo edición y que los datos iniciales existan.
    if (isEditing && initialOrderData) {
      // Establece el cliente y el destino
      setSelectedcustomer_id(String(initialOrderData.customer_id ?? ""));
      setSelectedDestinationId(initialOrderData.destination_id?.toString() ?? undefined);
      
      // Establece los camiones y choferes seleccionados
      setSelectedTruckIds(initialOrderData.trucks?.map((t: TruckType) => t.id.toString()) ?? []);
      setSelectedDriverIds(initialOrderData.drivers?.map((d: Driver) => d.id.toString()) ?? []);
      
      // Establece los items (productos) del pedido
      if (initialOrderData.items) {
        const items = initialOrderData.items.map((item) => ({
          id: crypto.randomUUID(),
          product: item.product!,
          quantity: item.quantity,
          pricePerUnit: Number(item.price_per_unit),
          subtotal: Number(item.quantity) * Number(item.price_per_unit),
        }));
        setOrderItems(items);
      }
    }
  }, [isEditing, initialOrderData]);

  const filteredDestinations = useMemo(() => {
    if (!selectedcustomer_id) return [];
    return initialDestinations.filter(
      (d) => d.customer_id.toString() === selectedcustomer_id
    );
  }, [selectedcustomer_id, initialDestinations]);

  const total = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [orderItems]);

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || currentQuantity <= 0) {
      toast.error("Selecciona un producto y una cantidad válida.");
      return;
    }
    const price = Number(selectedProduct.price_per_unit ?? 0);
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: currentQuantity,
      pricePerUnit: price,
      subtotal: currentQuantity * price,
    };
    setOrderItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setCurrentQuantity(0);
    toast.success(`${newItem.product.name} agregado al pedido.`);
  }, [selectedProduct, currentQuantity]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.info("Item eliminado del pedido.");
  }, []);

  const handleProductSelect = useCallback(
    (productId: string) => {
      const product = initialProducts.find(
        (p) => p.id.toString() === productId
      );
      setSelectedProduct(product || null);
      setCurrentQuantity(product ? 1 : 0);
    },
    [initialProducts]
  );

  const handleSubmit = () => {
     if (
      !selectedcustomer_id ||
      orderItems.length === 0 ||
      selectedTruckIds.length === 0 ||
      selectedDriverIds.length === 0
    ) {
      toast.error(
        "Completa todos los campos: Cliente, al menos un producto, un camión y un chofer."
      );
      return;
    }

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
      destination_id: selectedDestinationId
        ? parseInt(selectedDestinationId, 10)
        : null,
      items: orderItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
        unit: item.product.unit || "UNIDAD",
      })),
      total: total,
      truck_ids: selectedTruckIds.map((id) => parseInt(id, 10)),
      driver_ids: selectedDriverIds.map((id) => parseInt(id, 10)),
    };
    onSubmit(orderData);
  };

  const canSubmit = useMemo(
    () =>
      !!selectedcustomer_id &&
      orderItems.length > 0 &&
      selectedTruckIds.length > 0 &&
      selectedDriverIds.length > 0,
    [selectedcustomer_id, orderItems, selectedTruckIds, selectedDriverIds]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start p-2">
      <div className="lg:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="text-primary" />
              Datos Generales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* --- 👇 MODIFICADO PARA INCLUIR EL CAMPO DE FACTURA --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchableSelect
                  value={selectedcustomer_id}
                  onChange={(value) => {
                    setSelectedcustomer_id(value);
                    setSelectedDestinationId(undefined);
                    setSelectedInvoice(undefined); // Limpia la factura si cambia el cliente
                  }}
                  placeholder="Selecciona un cliente..."
                  options={initialClients.map((client) => ({ value: client.id.toString(), label: client.name }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Destino (Opcional)</Label>
                <SearchableSelect
                  value={selectedDestinationId}
                  onChange={setSelectedDestinationId}
                  placeholder="Selecciona un destino..."
                  disabled={!selectedcustomer_id || filteredDestinations.length === 0}
                  options={filteredDestinations.map((dest) => ({ value: dest.id.toString(), label: dest.name }))}
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
                options={initialInvoices
                  // Filtra facturas para que coincidan con el cliente seleccionado
                  .filter(inv => inv.customer_name === initialClients.find(c => c.id.toString() === selectedcustomer_id)?.name)
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="text-primary" />
              Datos Generales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchableSelect
                  value={selectedcustomer_id}
                  onChange={(value) => {
                    setSelectedcustomer_id(value);
                    setSelectedDestinationId(undefined);
                  }}
                  placeholder="Selecciona un cliente..."
                  options={initialClients.map((client) => ({
                    value: client.id.toString(),
                    label: client.name,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Destino (Opcional)</Label>
                <SearchableSelect
                  value={selectedDestinationId}
                  onChange={setSelectedDestinationId}
                  placeholder="Selecciona un destino..."
                  disabled={
                    !selectedcustomer_id || filteredDestinations.length === 0
                  }
                  options={filteredDestinations.map((dest) => ({
                    value: dest.id.toString(),
                    label: dest.name,
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="text-primary" />
              Transporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Camiones *</Label>
                <SearchableSelect
                  isMulti
                  value={selectedTruckIds}
                  onChange={setSelectedTruckIds}
                  placeholder="Selecciona camiones..."
                  options={initialTrucks.map((truck) => ({
                    value: truck.id.toString(),
                    label: `${truck.placa} (${truck.brand || "N/A"})`,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Choferes *</Label>
                <SearchableSelect
                  isMulti
                  value={selectedDriverIds}
                  onChange={setSelectedDriverIds}
                  placeholder="Selecciona choferes..."
                  options={initialDrivers.map((driver) => ({
                    value: driver.id.toString(),
                    label: driver.name,
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="text-primary" />
              Constructor de Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Producto</Label>
                <SearchableSelect
                  value={selectedProduct?.id.toString() || ""}
                  onChange={handleProductSelect}
                  placeholder="Seleccionar producto..."
                  options={initialProducts.map((product) => ({
                    value: product.id.toString(),
                    label: `${product.name} ($${Number(
                      product.price_per_unit
                    ).toFixed(2)})`,
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
            <Button
              onClick={handleAddItem}
              disabled={!selectedProduct || currentQuantity <= 0}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Pedido
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6 lg:sticky top-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="text-primary" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center font-bold text-2xl border-t pt-4">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <GradientButton
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              size="lg"
              className="w-full"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isSubmitting
                ? "Procesando..."
                : isEditing
                ? "Actualizar Pedido"
                : "Crear Pedido"}
            </GradientButton>
          </CardContent>
        </Card>

        {orderItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="text-primary" />
                Items del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity} {item.product.unit} x $
                          {item.pricePerUnit.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}