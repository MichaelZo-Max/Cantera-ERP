// app/(protected)/cashier/orders/order-form-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrderForm } from "./order-form";
import type { Client, Product, Destination, Truck, Driver } from "@/lib/types";

// Define las props que recibirá este componente cliente
interface OrderFormClientProps {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
}

export function OrderFormClient({
  clients,
  products,
  destinations,
  trucks,
  drivers,
}: OrderFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función para manejar el envío del formulario
  const handleCreateOrder = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear el pedido");
      }

      toast.success("¡Pedido creado exitosamente!");
      router.push("/cashier/orders/list"); // Redirige a la lista de pedidos
      router.refresh(); // Actualiza los datos de la cache
    } catch (error) {
      toast.error("Error al crear el pedido.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OrderForm
      // Corrige los nombres de las props a 'initial...'
      initialClients={clients}
      initialProducts={products}
      initialDestinations={destinations}
      initialTrucks={trucks}
      initialDrivers={drivers}
      // Pasa las props requeridas para el manejo del formulario
      onSubmit={handleCreateOrder}
      isSubmitting={isSubmitting}
      isEditing={false} // Indica que es un formulario de creación
    />
  );
}