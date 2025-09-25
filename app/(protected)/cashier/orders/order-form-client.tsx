// app/(protected)/cashier/orders/order-form-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrderForm } from "./order-form";
import type { Client, Product, Destination, Truck, Driver, Invoice } from "@/lib/types";

interface OrderFormClientProps {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
  invoices: Invoice[]; // Se mantiene para consistencia, pero recibirá []
}

export function OrderFormClient({
  clients,
  products,
  destinations,
  trucks,
  drivers,
  invoices, // Recibirá un array vacío
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
        const errorData = await response.json();
        throw new Error(errorData.message || "No se pudo crear el pedido");
      }

      toast.success("¡Pedido creado exitosamente!");
      router.push("/cashier/orders/list");
      router.refresh();
    } catch (error: any) {
      toast.error("Error al crear el pedido.", {
        description: error.message
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OrderForm
      initialClients={clients}
      initialProducts={products}
      initialDestinations={destinations}
      initialTrucks={trucks}
      initialDrivers={drivers}
      onSubmit={handleCreateOrder}
      isSubmitting={isSubmitting}
      isEditing={false}
    />
  );
}