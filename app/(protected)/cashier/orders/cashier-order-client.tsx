// app/(protected)/cashier/orders/cashier-order-client.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation"; // Importado para la redirección
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuantityInput } from "@/components/forms/quantity-input";
import { PhotoInput } from "@/components/forms/photo-input";
import { Plus, Trash2, Calculator, CreditCard, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import type {
  Client,
  Destination,
  Product,
  ProductFormat,
  ProductSelection,
  Truck as TruckType,
} from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id: string;
  productSelection: ProductSelection;
  product?: Product;
  format?: ProductFormat;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export function CashierOrderClientUI({
  initialClients,
  initialProducts,
  initialTrucks,
}: {
  initialClients: Client[];
  initialProducts: Product[];
  initialTrucks: TruckType[];
}) {
  const { user } = useAuth();
  const router = useRouter(); // Hook para manejar la navegación
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const [clients] = useState<Client[]>(initialClients);
  const [products] = useState<Product[]>(initialProducts);
  const [trucks] = useState<TruckType[]>(initialTrucks);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentProduct, setCurrentProduct] = useState<ProductSelection | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [currentFormat, setCurrentFormat] = useState<ProductFormat | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [truckPhoto, setTruckPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [availableFormats, setAvailableFormats] = useState<ProductFormat[]>([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(false);

  useEffect(() => {
    if (!selectedClient) {
      setDestinations([]);
      setSelectedDestination("");
      return;
    }
    const loadDestinations = async () => {
      try {
        const res = await fetch(`/api/destinations?clientId=${selectedClient}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        setDestinations(await res.json());
      } catch {
        setDestinations([]);
      }
    };
    loadDestinations();
  }, [selectedClient]);

  const findProduct = (id: string) => products.find((p) => p.id === id);

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const handleAddItem = () => {
    if (!currentProduct || currentQuantity <= 0 || !currentFormat) {
      toast.error("Selecciona un producto, formato y cantidad válida");
      return;
    }
    const product = findProduct(currentProduct.productId);
    if (!product) {
      toast.error("Producto no encontrado");
      return;
    }

    const price = Number(currentFormat.pricePerUnit ?? 0);
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      productSelection: currentProduct,
      product,
      format: currentFormat,
      quantity: currentQuantity,
      pricePerUnit: price,
      subtotal: currentQuantity * price,
    };
    setOrderItems((prev) => [...prev, newItem]);
    setCurrentProduct(null);
    setCurrentQuantity(0);
    setCurrentFormat(null);
    setSelectedProductId('');
    setAvailableFormats([]);
    toast.success("Item agregado a la comanda");
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Item eliminado");
  };

  const handleAuthorizeDispatch = async () => {
    if (!selectedClient || orderItems.length === 0 || !selectedTruckId || !paymentMethod) {
      toast.error("Completa los campos requeridos");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderData = {
        clientId: selectedClient,
        destinationId: selectedDestination || undefined,
        items: orderItems.map((item) => ({
          productFormatId: item.format!.id,
          cantidadBase: item.quantity,
          pricePerUnit: item.pricePerUnit,
          quantity: item.quantity,
        })),
        pago: { metodo: paymentMethod, monto: total, ref: paymentReference },
        truckId: selectedTruckId,
      };

      const formData = new FormData();
      formData.append('clientId', orderData.clientId);
      if (orderData.destinationId) formData.append('destinationId', orderData.destinationId);
      formData.append('items', JSON.stringify(orderData.items));
      formData.append('pago', JSON.stringify(orderData.pago));
      formData.append('truckId', orderData.truckId);
      if (user?.id) formData.append('userId', user.id);
      if (truckPhoto) formData.append('photoFile', truckPhoto);

      const res = await fetch("/api/orders", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const { order, delivery } = await res.json();
      toast.success(`Orden ${order?.orderNumber ?? ""} creada`, { description: delivery ? `Despacho ${delivery.id} asignado` : undefined });
      router.push("/");
      
      setSelectedClient("");
      setSelectedDestination("");
      setOrderItems([]);
      setPaymentMethod("");
      setPaymentReference("");
      setSelectedTruckId(null);
      setTruckPhoto(null);
    } catch (err: any) {
      toast.error("Error al autorizar despacho", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAuthorize = !!selectedClient && orderItems.length > 0 && !!selectedTruckId && !!paymentMethod;

  const fetchFormats = useCallback(async (productId: string) => {
    if (productId) {
      setIsLoadingFormats(true);
      setCurrentProduct({ productId, formatId: "" });
      setCurrentFormat(null);
      try {
        const res = await fetch(`/api/product-formats?productId=${productId}`);
        if (!res.ok) throw new Error("No se pudieron cargar los formatos");
        const data: ProductFormat[] = await res.json();
        setAvailableFormats(data);

        if (data.length === 1) {
          const singleFormat = data[0];
          setCurrentProduct({ productId, formatId: singleFormat.id });
          setCurrentFormat(singleFormat);
        }
      } catch (error) {
        toast.error("Error al cargar formatos.");
        setAvailableFormats([]);
      } finally {
        setIsLoadingFormats(false);
      }
    } else {
      setAvailableFormats([]);
      setCurrentProduct(null);
      setCurrentFormat(null);
    }
  }, []);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    fetchFormats(productId);
  };

  const handleFormatSelect = (formatId: string) => {
    if (selectedProductId) {
      setCurrentProduct({ productId: selectedProductId, formatId });
      const format = availableFormats.find(f => f.id === formatId);
      setCurrentFormat(format || null);
    }
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Cliente y Destino</CardTitle><CardDescription>Selecciona el cliente y destino para la orden</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Cliente *</Label><Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setSelectedDestination(""); }}><SelectTrigger><SelectValue placeholder="Selecciona cliente..." /></SelectTrigger><SelectContent>{clients.map((client) => (<SelectItem key={client.id} value={client.id}><div><div className="font-medium">{client.nombre}</div>{client.rif && <div className="text-sm text-muted-foreground">{client.rif}</div>}</div></SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Destino</Label><Select value={selectedDestination} onValueChange={setSelectedDestination} disabled={!selectedClient || destinations.length === 0}><SelectTrigger><SelectValue placeholder="Selecciona destino..." /></SelectTrigger><SelectContent>{destinations.map((destination) => (<SelectItem key={destination.id} value={destination.id}><div><div className="font-medium">{destination.nombre}</div>{destination.direccion && <div className="text-sm text-muted-foreground">{destination.direccion}</div>}</div></SelectItem>))}</SelectContent></Select></div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Constructor de Items</CardTitle><CardDescription>Agrega productos a la comanda</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={selectedProductId} onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                         {product.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProductId && (
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={currentProduct?.formatId || ""}
                    onValueChange={handleFormatSelect}
                    disabled={isLoadingFormats || availableFormats.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingFormats ? "Cargando..." : "Seleccionar formato..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormats.map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{format.sku || `Formato ${format.unidadBase}`}</span>
                            <Badge variant="secondary" className="ml-2">
                              {format.pricePerUnit ? `$${format.pricePerUnit.toFixed(2)}` : format.unidadBase}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {currentFormat && <QuantityInput unitBase={currentFormat.unidadBase} value={currentQuantity} onChange={setCurrentQuantity} />}
              {currentFormat && currentQuantity > 0 && (<div className="p-3 bg-muted/50 rounded-lg"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Subtotal:</span><span className="font-semibold">{(currentQuantity * Number(currentFormat.pricePerUnit ?? 0)).toFixed(2)}</span></div></div>)}
              <Button onClick={handleAddItem} disabled={!currentProduct || currentQuantity <= 0} className="w-full"><Plus className="h-4 w-4 mr-2" />Agregar Item</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>IVA (16%):</span><span>${tax.toFixed(2)}</span></div><div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>${total.toFixed(2)}</span></div></div>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Método de pago *</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue placeholder="Seleccionar método..." /></SelectTrigger><SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="credito">Crédito</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Referencia</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Número de referencia..." /></div>
              </div>
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2"><Truck className="h-4 w-4" />Asociar Camión *</h4>
                <Select value={selectedTruckId || ""} onValueChange={setSelectedTruckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar camión..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <div>
                              <div className="font-medium font-mono">{truck.placa}</div>
                              <div className="text-sm text-muted-foreground">{truck.brand} {truck.model}</div>
                            </div>
                          </div>
                          {truck.capacity && <Badge variant="outline">{truck.capacity} m³</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PhotoInput onSelect={setTruckPhoto} label="Foto del camión (opcional)" capture={true} />
              </div>
            </CardContent>
          </Card>
        </div>
        {orderItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Items de la Comanda</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Producto/Formato</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio Unit.</TableHead><TableHead>Subtotal</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>{orderItems.map((item) => (<TableRow key={item.id}><TableCell><div><div className="font-medium">{item.product?.nombre}</div><div className="text-sm text-muted-foreground">{item.format?.sku}</div></div></TableCell><TableCell>{item.quantity} {item.format?.unidadBase}</TableCell><TableCell>${item.pricePerUnit.toFixed(2)}</TableCell><TableCell className="font-medium">${item.subtotal.toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <div className="flex justify-end">
          <Button onClick={handleAuthorizeDispatch} disabled={!canAuthorize || isSubmitting} size="lg" className="min-w-[200px]"><CreditCard className="h-5 w-5 mr-2" />{isSubmitting ? "Procesando..." : "Autorizar Despacho"}</Button>
        </div>
      </div>
  );
}