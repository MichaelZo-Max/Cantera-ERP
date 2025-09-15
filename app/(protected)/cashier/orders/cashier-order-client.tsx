// app/(protected)/cashier/orders/cashier-order-client.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Client, Product, UnitBase } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

// Interface para los items del carrito/orden
interface OrderItem {
  id: string; // ID único para el item en el frontend
  product: Product;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

// Props del componente, ahora simplificadas
export function CashierOrderClientUI({
  initialClients,
  initialProducts,
}: {
  initialClients: Client[];
  initialProducts: Product[];
}) {
  const router = useRouter();

  // Estados para los datos maestros
  const [clients] = useState<Client[]>(initialClients);
  const [products] = useState<Product[]>(initialProducts);

  // Estado para la selección del cliente
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Estados para el constructor de items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);

  // Estado para el envío
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    toast.success(`${newItem.product.nombre} agregado al pedido.`);
  }, [selectedProduct, currentQuantity]);

  // Quitar un item del pedido
  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.info("Item eliminado del pedido.");
  }, []);

  // Seleccionar un producto de la lista
  const handleProductSelect = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      setSelectedProduct(product || null);
      setCurrentQuantity(product ? 1 : 0);
    },
    [products]
  );

  // --- LÓGICA DE ENVÍO CORREGIDA Y ADAPTADA ---
  const handleCreateOrder = useCallback(async () => {
    // Validaciones
    if (!selectedClientId || orderItems.length === 0) {
      toast.error(
        "Por favor, completa todos los campos requeridos: Cliente y al menos un producto."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Construir el objeto de datos que la API espera
      const orderData = {
        customer_id: parseInt(selectedClientId, 10),
        total: total, // El total calculado
        items: orderItems.map((item) => ({
          producto_id: parseInt(item.product.id, 10),
          quantity: item.quantity,
          price_per_unit: item.pricePerUnit,
          unit: item.product.unit, // Se añade la unidad del producto
        })),
      };

      // 2. Enviar la solicitud como JSON
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Si la validación falla, Zod envía un array de errores
        if (Array.isArray(errorData)) {
          const errorMessages = errorData.map((e) => e.message).join("\n");
          throw new Error(errorMessages);
        }
        throw new Error(errorData.message || "Error del servidor.");
      }

      const result = await res.json();
      toast.success(`Pedido #${result.id} creado exitosamente.`);
      router.push("/cashier/orders/list"); // Redirigir
    } catch (err: any) {
      toast.error("Error al crear el pedido", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedClientId, orderItems, total, router]);

  // Memo para habilitar/deshabilitar el botón de envío
  const canSubmit = useMemo(
    () => !!selectedClientId && orderItems.length > 0,
    [selectedClientId, orderItems]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos Generales del Pedido</CardTitle>
          <CardDescription>
            Selecciona el cliente para el pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label>Cliente *</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <Select
                  value={selectedProduct?.id || ""}
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <span>{product.nombre}</span>
                        <Badge variant="secondary" className="ml-4">
                          {product.price_per_unit
                            ? `$${product.price_per_unit.toFixed(2)}`
                            : "N/A"}{" "}
                          / {product.unit}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <QuantityInput
                  unitBase={(selectedProduct?.unit as UnitBase) || "m3"}
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
                  currentQuantity * (selectedProduct.price_per_unit ?? 0)
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
                    <TableCell>{item.product.nombre}</TableCell>
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
