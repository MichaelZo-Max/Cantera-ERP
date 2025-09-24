"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  UnitBase,
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

// --- NUEVO ---: Extendemos el tipo Product para incluir la cantidad disponible
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
  const [selectedcustomer_id, setSelectedcustomer_id] = useState<string | undefined>(initialOrderData?.customer_id?.toString);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>(initialOrderData?.destination_id?.toString());
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>(initialOrderData?.trucks?.map((t) => t.id.toString()) ?? []);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>(initialOrderData?.drivers?.map((d) => d.id.toString()) ?? []);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithAvailableQuantity | null>(null); // MODIFICADO
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // --- Estados para Clientes Paginados ---
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 500);
  const [clientPage, setClientPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(10);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const selectedClient = useMemo(() => clients.find((c) => c.id.toString() === selectedcustomer_id), [clients, selectedcustomer_id]);

  // --- Estados para Productos Paginados ---
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(10);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // --- Estados para Facturas Dinámicas ---
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);

  // --- MODIFICADO ---: Estado para productos de factura con cantidad
  const [invoiceProducts, setInvoiceProducts] = useState<ProductWithAvailableQuantity[]>([]);
  const [isInvoiceProductsLoading, setIsInvoiceProductsLoading] = useState(false);

  // ... (useEffect de edición y carga de facturas permanecen iguales) ...
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

  // --- Efecto para cargar facturas al seleccionar un cliente ---
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
        setAvailableInvoices([]);
      } finally {
        setIsInvoicesLoading(false);
      }
    };
    fetchInvoicesForClient();
  }, [selectedClient]);

  // --- Efecto para cargar productos de facturas (sin cambios en la lógica) ---
  useEffect(() => {
    const fetchProductsForInvoices = async () => {
      if (selectedInvoices.length === 0) {
        setInvoiceProducts([]);
        return;
      }
      setIsInvoiceProductsLoading(true);
      try {
        const invoicesData = selectedInvoices.map((invoiceString) => {
          const [series, number, n] = invoiceString.split("|");
          return { invoice_series: series, invoice_number: parseInt(number, 10), invoice_n: n };
        });
        const res = await fetch(`/api/invoice-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoicesData),
        });
        if (!res.ok) throw new Error("No se pudieron cargar los productos de las facturas");
        const result: ProductWithAvailableQuantity[] = await res.json(); // MODIFICADO
        setInvoiceProducts(result);
      } catch (error) {
        toast.error("Error al cargar los productos de las facturas.");
        setInvoiceProducts([]);
      } finally {
        setIsInvoiceProductsLoading(false);
      }
    };
    fetchProductsForInvoices();
  }, [selectedInvoices]);
  
  // ... (lógica de paginación sin cambios) ...
  useEffect(() => {
    // Solo busca productos si no hay facturas seleccionadas
    if (selectedInvoices.length > 0) return;

    const fetchProducts = async () => {
      setIsProductsLoading(true);
      const params = new URLSearchParams({ page: String(productPage), limit: "20", q: debouncedProductSearch });
      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("No se pudieron cargar los productos");
        const result: PaginatedResponse<Product> = await res.json();
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = result.data.filter((p) => !existingIds.has(p.id));
          return productPage === 1 ? result.data : [...prev, ...newProducts];
        });
        setProductTotalPages(result.totalPages);
      } catch (error) {
        toast.error("Error al cargar productos.");
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, [productPage, debouncedProductSearch, selectedInvoices.length]);

  useEffect(() => {
    const fetchClients = async () => {
      setIsClientsLoading(true);
      const params = new URLSearchParams({ page: String(clientPage), limit: "20", q: debouncedClientSearch });
      try {
        const res = await fetch(`/api/customers?${params.toString()}`);
        if (!res.ok) throw new Error("No se pudieron cargar los clientes");
        const result: PaginatedResponse<Client> = await res.json();
        setClients((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newClients = result.data.filter((c) => !existingIds.has(c.id));
          return clientPage === 1 ? result.data : [...prev, ...newClients];
        });
        setClientTotalPages(result.totalPages);
      } catch (error) {
        toast.error("Error al cargar clientes.");
      } finally {
        setIsClientsLoading(false);
      }
    };
    fetchClients();
  }, [clientPage, debouncedClientSearch]);


  useEffect(() => setClientPage(1), [debouncedClientSearch]);
  useEffect(() => setProductPage(1), [debouncedProductSearch]);

  const filteredDestinations = useMemo(() => {
    if (!selectedcustomer_id) return [];
    return initialDestinations.filter((d) => d.customer_id.toString() === selectedcustomer_id);
  }, [selectedcustomer_id, initialDestinations]);

  const total = useMemo(() => orderItems.reduce((sum, item) => sum + item.subtotal, 0), [orderItems]);

  // --- NUEVO ---: Calculamos la cantidad máxima permitida para el producto seleccionado
  const availableQuantityForSelectedProduct = useMemo(() => {
    if (!selectedProduct || selectedInvoices.length === 0) {
      return undefined; // Sin límite si no hay facturas
    }
    const totalAvailable = selectedProduct.available_quantity ?? 0;
    const quantityInCart = orderItems
      .filter(item => item.product.id === selectedProduct.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return totalAvailable - quantityInCart;
  }, [selectedProduct, orderItems, selectedInvoices.length]);

  // --- MODIFICADO ---: Ahora `handleAddItem` valida contra la cantidad disponible
  const handleAddItem = useCallback(() => {
    if (!selectedProduct || currentQuantity <= 0) {
      toast.error("Por favor, selecciona un producto y una cantidad válida.");
      return;
    }
    // Nueva validación de cantidad
    if (availableQuantityForSelectedProduct !== undefined && currentQuantity > availableQuantityForSelectedProduct) {
      toast.error(`La cantidad no puede superar la disponible en factura (${availableQuantityForSelectedProduct.toFixed(2)}).`);
      return;
    }
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: currentQuantity,
      pricePerUnit: Number(selectedProduct.price_per_unit),
      subtotal: currentQuantity * Number(selectedProduct.price_per_unit),
    };
    setOrderItems((prevItems) => [...prevItems, newItem]);
    setSelectedProduct(null);
    setCurrentQuantity(0);
    setProductSearch("");
    toast.success(`${newItem.product.name} ha sido agregado al pedido.`);
  }, [selectedProduct, currentQuantity, availableQuantityForSelectedProduct]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    toast.success("Producto eliminado del pedido.");
  }, []);

  const productSelectionPool = useMemo(() => selectedInvoices.length > 0 ? invoiceProducts : products, [selectedInvoices, invoiceProducts, products]);

  const handleProductSelect = useCallback((productId: string) => {
    const product = productSelectionPool.find((p) => p.id.toString() === productId);
    setSelectedProduct(product || null);
    setCurrentQuantity(product ? 1 : 0);
  }, [productSelectionPool]);

  useEffect(() => {
    if (selectedInvoices.length > 0) {
      setOrderItems([]);
    }
  }, [selectedInvoices]);

  // ... (handleFormSubmit y canSubmit permanecen iguales) ...
  const handleFormSubmit = () => {
    if (!selectedcustomer_id || orderItems.length === 0 || selectedTruckIds.length === 0 || selectedDriverIds.length === 0) {
      toast.error("Completa todos los campos requeridos: Cliente, al menos un producto, un camión y un chofer.");
      return;
    }
    // La validación de facturas seleccionadas ahora es opcional
    if (selectedInvoices.length === 0) {
      toast.warning("Estás creando un pedido sin facturas asociadas. ¿Deseas continuar?", {
        action: {
          label: "Continuar",
          onClick: () => proceedSubmit(),
        },
      });
    } else {
      proceedSubmit();
    }
  };

  const proceedSubmit = () => {
    const invoicesData = selectedInvoices.map((invoiceString) => {
      const [series, number, n] = invoiceString.split("|");
      return { invoice_series: series, invoice_number: parseInt(number, 10), invoice_n: n };
    });

    const orderData = {
      customer_id: parseInt(selectedcustomer_id!, 10),
      destination_id: selectedDestinationId ? parseInt(selectedDestinationId, 10) : null,
      items: orderItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
        unit: item.product.unit || "UNIDAD",
      })),
      total: total,
      truck_ids: selectedTruckIds.map((id) => parseInt(id, 10)),
      driver_ids: selectedDriverIds.map((id) => parseInt(id, 10)),
      invoices: invoicesData,
    };
    onSubmit(orderData);
  }

  const canSubmit = useMemo(() => !!selectedcustomer_id && orderItems.length > 0 && selectedTruckIds.length > 0 && selectedDriverIds.length > 0, [selectedcustomer_id, orderItems, selectedTruckIds, selectedDriverIds]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start p-2">
      {/* --- Columna Izquierda (Formularios) --- */}
      <div className="lg:col-span-3 space-y-6">
        {/* ... (Card de Datos Generales y Transporte sin cambios) ... */}
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
                    setSelectedInvoices([]);
                  }}
                  placeholder="Selecciona un cliente..."
                  options={clients.map((client) => ({ value: client.id.toString(), label: client.name }))}
                  onSearch={setClientSearch}
                  onLoadMore={() => { if (clientPage < clientTotalPages && !isClientsLoading) setClientPage((p) => p + 1); }}
                  hasNextPage={clientPage < clientTotalPages}
                  isLoading={isClientsLoading}
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
            <div className="mt-4 space-y-2">
              <Label className="flex items-center gap-2">
                <FileText size={16} /> Vincular Factura(s) (Opcional)
              </Label>
              <SearchableSelect
                isMulti
                value={selectedInvoices}
                onChange={setSelectedInvoices}
                placeholder={selectedClient ? "Selecciona una o más facturas..." : "Primero selecciona un cliente"}
                disabled={!selectedcustomer_id || isInvoicesLoading}
                isLoading={isInvoicesLoading}
                options={availableInvoices.map((inv) => ({
                  value: `${inv.invoice_series}|${inv.invoice_number}|${inv.invoice_n}`,
                  label: `${inv.invoice_series}-${inv.invoice_number} ($${(inv.total_usd ?? 0).toFixed(2)})`,
                }))}
              />
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
                <SearchableSelect isMulti value={selectedTruckIds} onChange={setSelectedTruckIds} placeholder="Selecciona camiones..."
                  options={initialTrucks.map((truck) => ({ value: truck.id.toString(), label: `${truck.placa} (${truck.brand || "N/A"})` }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Choferes *</Label>
                <SearchableSelect isMulti value={selectedDriverIds} onChange={setSelectedDriverIds} placeholder="Selecciona choferes..."
                  options={initialDrivers.map((driver) => ({ value: driver.id.toString(), label: driver.name }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="text-primary" /> Constructor de Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedInvoices.length > 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Productos Restringidos por Factura</AlertTitle>
                <AlertDescription>
                  Solo puedes agregar productos que pertenezcan a las facturas seleccionadas.
                </AlertDescription>
              </Alert>
            ) : null }
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Producto</Label>
                <SearchableSelect
                  value={selectedProduct?.id.toString() || ""}
                  onChange={handleProductSelect}
                  placeholder={isInvoiceProductsLoading ? "Cargando productos..." : "Seleccionar producto..."}
                  options={productSelectionPool.map((product) => ({
                    value: product.id.toString(),
                    label: `${product.name} ($${Number(product.price_per_unit).toFixed(2)})`,
                  }))}
                  onSearch={selectedInvoices.length === 0 ? setProductSearch : undefined}
                  onLoadMore={selectedInvoices.length === 0 ? () => { if (productPage < productTotalPages && !isProductsLoading) setProductPage((p) => p + 1) } : undefined}
                  hasNextPage={selectedInvoices.length === 0 ? productPage < productTotalPages : false}
                  isLoading={isProductsLoading || isInvoiceProductsLoading}
                />
              </div>
              <div className="space-y-2">
                <QuantityInput
                  value={currentQuantity}
                  onChange={setCurrentQuantity}
                  disabled={!selectedProduct}
                  // --- NUEVO ---: Pasamos el límite máximo al input
                  max={availableQuantityForSelectedProduct}
                />
                {/* --- NUEVO ---: Mostramos la cantidad disponible al usuario */}
                {selectedInvoices.length > 0 && availableQuantityForSelectedProduct !== undefined && selectedProduct && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponible: <strong>{availableQuantityForSelectedProduct.toFixed(2)}</strong> {selectedProduct.unit}
                  </p>
                )}
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
      {/* --- Columna Derecha (Resumen) sin cambios --- */}
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
              onClick={handleFormSubmit}
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
              <CardTitle>Items del Pedido</CardTitle>
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