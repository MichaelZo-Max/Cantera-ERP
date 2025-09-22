// app/(protected)/cashier/orders/list/edit-order-modal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OrderForm } from "../order-form";
import { toast } from "sonner";
import type { Order, Client, Product, Destination, Truck, Driver, Invoice } from "@/lib/types";

interface EditOrderModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onFinished: () => void;
}

interface Catalogs {
  clients: Client[];
  products: Product[];
  destinations: Destination[];
  trucks: Truck[];
  drivers: Driver[];
  invoices: Invoice[];
}

export function EditOrderModal({ orderId, isOpen, onClose, onFinished }: EditOrderModalProps) {
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [clientsRes, productsRes, destinationsRes, trucksRes, driversRes, invoicesRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products"),
          fetch("/api/destinations"),
          fetch("/api/trucks"),
          fetch("/api/drivers"),
          fetch("/api/invoices"), // ✅ Se añade la petición de facturas
        ]);

        const clients = await clientsRes.json();
        const products = await productsRes.json();
        const destinations = await destinationsRes.json();
        const trucks = await trucksRes.json();
        const drivers = await driversRes.json();
        const invoices = await invoicesRes.json();

        setCatalogs({ clients, products, destinations, trucks, drivers, invoices });
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los catálogos iniciales.");
      }
    };
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (isOpen && orderId) {
      const fetchOrderData = async () => {
        setIsLoading(true);
        try {
          const orderRes = await fetch(`/api/orders/${orderId}`);
          if (!orderRes.ok) throw new Error("Error al cargar la orden");
          const order = await orderRes.json();
          setOrderData(order);
        } catch (error) {
          console.error(error);
          toast.error("No se pudieron cargar los datos para la edición.");
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrderData();
    }
  }, [isOpen, orderId, onClose]);

  const handleUpdateOrder = async (data: any) => {
    if (!orderId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error del servidor.");
      }
      
      const result = await res.json();
      toast.success(`Pedido #${result.order_number} actualizado exitosamente.`);
      onFinished();
    } catch (err: any) {
      toast.error("Error al actualizar el pedido", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{orderData?.order_number}</DialogTitle>
          <DialogDescription>
            Modifica los detalles del pedido. Haz clic en actualizar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          {isLoading && <p>Cargando datos de la orden...</p>}
          {!isLoading && orderData && catalogs && (
            <OrderForm
              initialClients={catalogs.clients}
              initialInvoices={catalogs.invoices}
              initialProducts={catalogs.products}
              initialDestinations={catalogs.destinations}
              initialTrucks={catalogs.trucks}
              initialDrivers={catalogs.drivers}
              isEditing
              initialOrderData={orderData}
              onSubmit={handleUpdateOrder}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}