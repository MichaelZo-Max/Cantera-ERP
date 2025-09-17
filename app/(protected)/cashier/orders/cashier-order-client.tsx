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
import { Plus, Trash2, Calculator, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { Client, Product, UnitBase, Destination } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
      toast.success(`Pedido #${result.orderId} creado exitosamente.`);
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
      <Card>
        <CardHeader>
          <CardTitle>Datos Generales del Pedido</CardTitle>
          <CardDescription>
            Selecciona el cliente y el destino para el pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <SearchableSelect
                value={selectedcustomer_id}
                onChange={(value) => {
                  setSelectedcustomer_id(value);
                  setSelectedDestinationId(undefined);
                }}
                placeholder="Selecciona cliente..."
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
                    : "Selecciona destino..."
                }
                disabled={!selectedcustomer_id || filteredDestinations.length === 0}
                options={filteredDestinations.map((dest) => ({
                  value: dest.id.toString(),
                  label: dest.name,
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus />
              Constructor de Items
            </CardTitle>
            <CardDescription>Agrega productos al pedido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Cantidad</Label>
                <QuantityInput
                  unitBase={(selectedProduct?.unit as UnitBase) || "M3"}
                  value={currentQuantity}
                  onChange={setCurrentQuantity}
                  disabled={!selectedProduct}
                />
              </div>
            </div>
            {selectedProduct && (
              <div className="text-right font-semibold">
                Subtotal del item: $
                {(
                  currentQuantity *
                  (Number(selectedProduct.price_per_unit) ?? 0)
                ).toFixed(2)}
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Button
              onClick={handleCreateOrder}
              disabled={!canSubmit || isSubmitting}
              size="lg"
              className="w-full"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isSubmitting ? "Procesando..." : "Crear Pedido"}
            </Button>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Cantidad</TableHead>
                  <TableHead>P. Unit.</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell>
                      {item.quantity} {item.product.unit}
                    </TableCell>
                    <TableCell>${item.pricePerUnit.toFixed(2)}</TableCell>
                    <TableCell>${item.subtotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}