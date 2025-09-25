// app/(protected)/cashier/orders/[id]/order-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrderForm } from "../order-form";
import type { Client, Product, Destination, Truck as TruckType, Driver, Order } from "@/lib/types";

interface Catalogs {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: TruckType[];
  drivers: Driver[];
}

interface OrderClientProps {
  orderData: Order;
  catalogs: Catalogs;
}

export function OrderClient({ orderData, catalogs }: OrderClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateOrder = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderData.id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "No se pudo actualizar el pedido");
      }
      
      const result = await res.json();
      toast.success(`Pedido #${result.order_number} actualizado exitosamente.`);
      router.push("/cashier/orders/list");
      router.refresh();

    } catch (err: any) {
      toast.error("Error al actualizar el pedido", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OrderForm
      initialClients={catalogs.clients}
      initialProducts={catalogs.products}
      initialDestinations={catalogs.destinations}
      initialTrucks={catalogs.trucks}
      initialDrivers={catalogs.drivers}
      isEditing
      initialOrderData={orderData}
      onSubmit={handleUpdateOrder}
      isSubmitting={isSubmitting}
    />
  );
}