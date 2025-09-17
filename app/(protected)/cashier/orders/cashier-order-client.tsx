"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  MapPin,
  Package,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import type { Client, Product, UnitBase, Destination } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";

// Interface para los items del carrito/orden
interface OrderItem {
  id: string; // ID único para el item en el frontend
  product: Product;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export function CashierOrderClientUI({
  initialClients,
  initialProducts,
  initialDestinations,
}: {
  initialClients: Client[];
  initialProducts: Product[];
  initialDestinations: Destination[];
}) {
  const router = useRouter();

  // Estados para los datos maestros
  const [clients] = useState<Client[]>(initialClients);
  const [products] = useState<Product[]>(initialProducts);
  const [destinations] = useState<Destination[]>(initialDestinations);

  // Estados para la selección
  const [selectedcustomer_id, setSelectedcustomer_id] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<
    string | undefined
  >();

  // Estados para el constructor de items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);

  // Estado para el envío
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar destinos basados en el cliente seleccionado
  const filteredDestinations = useMemo(() => {
    if (!selectedcustomer_id) return [];
    return destinations.filter(
      (d) => d.customer_id.toString() === selectedcustomer_id
    );
  }, [selectedcustomer_id, destinations]);

  // Calcular totales
  const total = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [orderItems]);

  // Agregar un item al pedido
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

  // Quitar un item del pedido
  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.info("Item eliminado del pedido.");
  }, []);

  // Seleccionar un producto de la lista
  const handleProductSelect = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id.toString() === productId);
      setSelectedProduct(product || null);
      setCurrentQuantity(product ? 1 : 0);
    },
    [products]
  );

  // Lógica de envío
  const handleCreateOrder = useCallback(async () => {
    if (!selectedcustomer_id || orderItems.length === 0) {
      toast.error(
        "Por favor, completa todos los campos requeridos: Cliente y al menos un producto."
      );
      return;
    }

    setIsSubmitting(true);

    try {
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
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (Array.isArray(errorData)) {
          const errorMessages = errorData.map((e) => e.message).join("\n");
          throw new Error(errorMessages);
        }
        throw new Error(errorData.message || "Error del servidor.");
      }

      const result = await res.json();
      toast.success(`Pedido #${result.order_id} creado exitosamente.`);
      router.push("/cashier/orders/list");
    } catch (err: any) {
      toast.error("Error al crear el pedido", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedcustomer_id, selectedDestinationId, orderItems, total, router]);

  const canSubmit = useMemo(
    () => !!selectedcustomer_id && orderItems.length > 0,
    [selectedcustomer_id, orderItems]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Columna Izquierda: Formularios */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="text-primary" />
                Datos Generales del Pedido
              </CardTitle>
              <CardDescription>
                Selecciona el cliente y el destino para el pedido.
              </CardDescription>
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
                    options={clients.map((client) => ({
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
                    placeholder={
                      !selectedcustomer_id
                        ? "Primero selecciona un cliente"
                        : "Selecciona un destino..."
                    }
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
          </AnimatedCard>

          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="text-primary" />
                Constructor de Items
              </CardTitle>
              <CardDescription>Agrega productos al pedido.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <SearchableSelect
                    value={selectedProduct?.id.toString() || ""}
                    onChange={handleProductSelect}
                    placeholder="Seleccionar producto..."
                    options={products.map((product) => ({
                      value: product.id.toString(),
                      label: (
                        <div className="flex justify-between items-center w-full">
                          <span>{product.name}</span>
                          <Badge variant="secondary">
                            {product.price_per_unit
                              ? `$${Number(product.price_per_unit).toFixed(2)}`
                              : "N/A"}{" "}
                            / {product.unit}
                          </Badge>
                        </div>
                      ),
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

              {selectedProduct && (
                <div className="text-right font-semibold text-muted-foreground pt-2">
                  Subtotal del item:{" "}
                  <span className="text-foreground">
                    $
                    {(
                      currentQuantity *
                      (Number(selectedProduct.price_per_unit) ?? 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              <Button
                onClick={handleAddItem}
                disabled={!selectedProduct || currentQuantity <= 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar al Pedido
              </Button>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Columna Derecha: Resumen y Lista de Items */}
        <div className="lg:col-span-2 space-y-6 lg:sticky top-24">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="text-primary" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center font-bold text-2xl border-t pt-4">
                <span>Total:</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
              <GradientButton
                onClick={handleCreateOrder}
                disabled={!canSubmit || isSubmitting}
                size="lg"
                className="w-full"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {isSubmitting ? "Procesando..." : "Crear Pedido"}
              </GradientButton>
            </CardContent>
          </AnimatedCard>

          {orderItems.length > 0 && (
            <AnimatedCard>
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
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-muted-foreground text-xs">
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
            </AnimatedCard>
          )}

          {orderItems.length === 0 && (
            <EmptyState
              title="Tu pedido está vacío"
              description="Añade productos desde el constructor de items para empezar."
              icon={<ShoppingCart className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </div>
      </div>
    </div>
  );
}