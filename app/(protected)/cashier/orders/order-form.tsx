"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Package,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Client,
  Product,
  Destination,
  Truck as TruckType,
  Driver,
  Order,
  Invoice,
} from "@/lib/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GradientButton } from "@/components/ui/gradient-button";
import { useDebounce } from "@/hooks/use-debounce";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Tipos extendidos ---
interface ProductWithAvailableQuantity extends Product {
  available_quantity?: number;
}
interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
}
interface InvoicesApiResponse {
  invoices: Invoice[];
  totalPages: number;
  currentPage: number;
}
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
  isEditing = false,
  initialOrderData,
  onSubmit,
  isSubmitting,
}: OrderFormProps) {
  // --- Estados del Formulario ---
  const [selectedcustomer_id, setSelectedcustomer_id] = useState<string | undefined>(undefined);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>(undefined);
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // --- Estados para Paginación y Búsqueda ---
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 500);
  const [clientPage, setClientPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(10);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(10);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // --- Estados para Facturas ---
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [isInvoiceItemsLoading, setIsInvoiceItemsLoading] = useState(false);

  const prevInvoicesRef = useRef<string[]>();

  useEffect(() => {
    if (isEditing && initialOrderData) {
      setSelectedcustomer_id(initialOrderData.customer_id?.toString());
      setSelectedDestinationId(initialOrderData.destination_id?.toString());
      setSelectedTruckIds(initialOrderData.trucks?.map((t: TruckType) => t.id.toString()) ?? []);
      setSelectedDriverIds(initialOrderData.drivers?.map((d: Driver) => d.id.toString()) ?? []);
      
      if (initialOrderData.items) {
        setOrderItems(initialOrderData.items.map((item) => ({
          id: crypto.randomUUID(),
          product: item.product!,
          quantity: item.quantity,
          pricePerUnit: Number(item.price_per_unit),
          subtotal: Number(item.quantity) * Number(item.price_per_unit),
        })));
      }
      
      if (initialOrderData.invoices && initialOrderData.invoices.length > 0) {
        const invoiceValues = initialOrderData.invoices.map((inv) => `${inv.invoice_series}|${inv.invoice_number}|${inv.invoice_n}`);
        setSelectedInvoices(invoiceValues);
      }
    }
  }, [isEditing, initialOrderData]);

  const selectedClient = useMemo(() => clients.find((c) => c.id.toString() === selectedcustomer_id), [clients, selectedcustomer_id]);
  const filteredDestinations = useMemo(() => {
    if (!selectedcustomer_id) return [];
    return initialDestinations.filter((d) => d.customer_id.toString() === selectedcustomer_id);
  }, [selectedcustomer_id, initialDestinations]);
  const total = useMemo(() => orderItems.reduce((sum, item) => sum + item.subtotal, 0), [orderItems]);
  const canSubmit = useMemo(() => !!selectedcustomer_id && orderItems.length > 0 && selectedTruckIds.length > 0 && selectedDriverIds.length > 0, [selectedcustomer_id, orderItems, selectedTruckIds, selectedDriverIds]);

  useEffect(() => {
    const fetchInvoicesForClient = async () => {
      if (!selectedClient) {
        setAvailableInvoices([]);
        return;
      }
      setIsInvoicesLoading(true);
      try {
        const params = new URLSearchParams({ customerName: selectedClient.name, pageSize: "1000" });
        const res = await fetch(`/api/invoices?${params.toString()}`);
        if (!res.ok) throw new Error("No se pudieron cargar las facturas");
        const result: InvoicesApiResponse = await res.json();
        setAvailableInvoices(result.invoices || []);
      } catch (error) {
        toast.error("Error al cargar las facturas del cliente.");
      } finally {
        setIsInvoicesLoading(false);
      }
    };
    fetchInvoicesForClient();
  }, [selectedClient]);

  useEffect(() => {
    const fetchAndSetInvoiceItems = async () => {
      const prevInvoices = prevInvoicesRef.current;
      prevInvoicesRef.current = selectedInvoices;

      if (JSON.stringify(prevInvoices) === JSON.stringify(selectedInvoices)) return;
      if ((prevInvoices?.length ?? 0) > 0 && selectedInvoices.length === 0) {
        setOrderItems([]);
        return;
      }
      if (selectedInvoices.length === 0) return;
      
      setIsInvoiceItemsLoading(true);
      toast.info("Cargando productos de las facturas...");
      
      try {
        const invoicesData = selectedInvoices.map((invStr) => {
          const [series, number, n] = invStr.split("|");
          return { invoice_series: series, invoice_number: parseInt(number, 10), invoice_n: n };
        });
        
        const res = await fetch(`/api/invoice-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoicesData),
        });

        if (!res.ok) throw new Error("Error al cargar productos de facturas");
        
        const productsFromInvoices: ProductWithAvailableQuantity[] = await res.json();
        const newOrderItems = productsFromInvoices.map((p) => ({
          id: crypto.randomUUID(),
          product: p,
          quantity: p.available_quantity ?? 0,
          pricePerUnit: Number(p.price_per_unit),
          subtotal: (p.available_quantity ?? 0) * Number(p.price_per_unit),
        }));

        setOrderItems(newOrderItems);
        if (newOrderItems.length > 0) toast.success("Productos cargados desde facturas.");
        else toast.warning("Las facturas no tienen productos para despachar.");

      } catch (error) {
        toast.error("Error al cargar los productos de las facturas.");
        setOrderItems([]);
      } finally {
        setIsInvoiceItemsLoading(false);
      }
    };

    fetchAndSetInvoiceItems();
  }, [selectedInvoices]);

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || currentQuantity <= 0) {
      toast.error("Por favor, selecciona un producto y una cantidad válida.");
      return;
    }
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: currentQuantity,
      pricePerUnit: Number(selectedProduct.price_per_unit),
      subtotal: currentQuantity * Number(selectedProduct.price_per_unit),
    };
    setOrderItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setCurrentQuantity(0);
    setProductSearch("");
    toast.success(`${newItem.product.name} agregado al pedido.`);
  }, [selectedProduct, currentQuantity]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Producto eliminado del pedido.");
  }, []);

  const handleProductSelect = useCallback((productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    setSelectedProduct(product || null);
    setCurrentQuantity(product ? 1 : 0);
  }, [products]);

  const proceedSubmit = () => {
    const orderData = {
      customer_id: parseInt(selectedcustomer_id!, 10),
      destination_id: selectedDestinationId ? parseInt(selectedDestinationId, 10) : null,
      items: orderItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
        unit: item.product.unit || "UNIDAD",
      })),
      // --- **CORRECCIÓN**: La siguiente línea ha sido eliminada ---
      // total: total,
      truck_ids: selectedTruckIds.map((id) => parseInt(id, 10)),
      driver_ids: selectedDriverIds.map((id) => parseInt(id, 10)),
      invoices: selectedInvoices.map((invStr) => {
        const [series, number, n] = invStr.split("|");
        return { invoice_series: series, invoice_number: parseInt(number, 10), invoice_n: n };
      }),
    };
    onSubmit(orderData);
  };

  const handleFormSubmit = () => {
    if (!canSubmit) {
      toast.error("Completa todos los campos requeridos: Cliente, al menos un producto, un camión y un chofer.");
      return;
    }
    if (selectedInvoices.length === 0) {
      toast.warning("Estás creando un pedido sin facturas. ¿Deseas continuar?", {
        action: { label: "Continuar", onClick: proceedSubmit },
      });
    } else {
      proceedSubmit();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start p-2">
      {/* Columna Izquierda (Formularios) */}
      <div className="lg:col-span-3 space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="text-primary" />Datos Generales</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchableSelect value={selectedcustomer_id} onChange={(v) => { setSelectedcustomer_id(v); setSelectedDestinationId(undefined); setSelectedInvoices([]); }} placeholder="Selecciona un cliente..." options={clients.map((c) => ({ value: c.id.toString(), label: c.name }))} onSearch={setClientSearch} onLoadMore={() => { if (clientPage < clientTotalPages && !isClientsLoading) setClientPage(p => p + 1); }} hasNextPage={clientPage < clientTotalPages} isLoading={isClientsLoading} />
              </div>
              <div className="space-y-2">
                <Label>Destino (Opcional)</Label>
                <SearchableSelect value={selectedDestinationId} onChange={setSelectedDestinationId} placeholder="Selecciona un destino..." disabled={!selectedcustomer_id || filteredDestinations.length === 0} options={filteredDestinations.map((d) => ({ value: d.id.toString(), label: d.name }))} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="flex items-center gap-2"><FileText size={16} />Vincular Factura(s) (Opcional)</Label>
              <SearchableSelect isMulti value={selectedInvoices} onChange={setSelectedInvoices} placeholder={selectedClient ? "Selecciona una o más facturas..." : "Primero selecciona un cliente"} disabled={!selectedcustomer_id || isInvoicesLoading} isLoading={isInvoicesLoading} options={availableInvoices.map((inv) => ({ value: `${inv.invoice_series}|${inv.invoice_number}|${inv.invoice_n}`, label: `${inv.invoice_series}-${inv.invoice_number} ($${(inv.total_usd ?? 0).toFixed(2)})` }))} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="text-primary" />Transporte</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Camiones *</Label>
                <SearchableSelect isMulti value={selectedTruckIds} onChange={setSelectedTruckIds} placeholder="Selecciona camiones..." options={initialTrucks.map((t) => ({ value: t.id.toString(), label: `${t.placa} (${t.brand || "N/A"})` }))} />
              </div>
              <div className="space-y-2">
                <Label>Choferes *</Label>
                <SearchableSelect isMulti value={selectedDriverIds} onChange={setSelectedDriverIds} placeholder="Selecciona choferes..." options={initialDrivers.map((d) => ({ value: d.id.toString(), label: d.name }))} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {selectedInvoices.length === 0 ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="text-primary" />Constructor de Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <SearchableSelect value={selectedProduct?.id.toString() || ""} onChange={handleProductSelect} placeholder={isProductsLoading ? "Cargando..." : "Seleccionar producto..."} options={products.map((p) => ({ value: p.id.toString(), label: `${p.name} ($${Number(p.price_per_unit).toFixed(2)})` }))} onSearch={setProductSearch} onLoadMore={() => { if (productPage < productTotalPages && !isProductsLoading) setProductPage(p => p + 1); }} hasNextPage={productPage < productTotalPages} isLoading={isProductsLoading} />
                </div>
                <div className="space-y-2"><QuantityInput value={currentQuantity} onChange={setCurrentQuantity} disabled={!selectedProduct} /></div>
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProduct || currentQuantity <= 0} className="w-full"><Plus className="h-4 w-4 mr-2" />Agregar al Pedido</Button>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" /><AlertTitle>Productos Cargados desde Factura</AlertTitle>
            <AlertDescription>Los productos están definidos por las facturas. Para modificarlos, cambia la selección de facturas.</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Columna Derecha (Resumen) */}
      <div className="lg:col-span-2 space-y-6 lg:sticky top-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="text-primary" />Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center font-bold text-2xl border-t pt-4">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <GradientButton onClick={handleFormSubmit} disabled={!canSubmit || isSubmitting || isInvoiceItemsLoading} size="lg" className="w-full">
              <CreditCard className="h-5 w-5 mr-2" />
              {isSubmitting || isInvoiceItemsLoading ? "Procesando..." : isEditing ? "Actualizar Pedido" : "Crear Pedido"}
            </GradientButton>
          </CardContent>
        </Card>
        
        {orderItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Items del Pedido</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.quantity} {item.product.unit} x ${item.pricePerUnit.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {selectedInvoices.length === 0 && (<Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
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