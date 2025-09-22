// app/(protected)/cashier/orders/order-form-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrderForm } from "./order-form";
// Asegúrate de que tu archivo de tipos exporte 'Invoice'
import type { Client, Product, Destination, Truck, Driver, Invoice } from "@/lib/types";

// Define las props que recibirá este componente cliente
interface OrderFormClientProps {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
  invoices: Invoice[]; // <-- Añadido
}

export function OrderFormClient({
  clients,
  products,
  destinations,
  trucks,
  drivers,
  invoices, // <-- Recibimos las facturas
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
      initialInvoices={invoices} // <-- Pasamos las facturas al formulario
      onSubmit={handleCreateOrder}
      isSubmitting={isSubmitting}
      isEditing={false}
    />
  );
}