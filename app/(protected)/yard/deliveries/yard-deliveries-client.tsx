// app/(protected)/yard/deliveries/yard-deliveries-client.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoInput } from "@/components/forms/photo-input";
import {
  Search,
  Truck,
  User,
  CheckCircle,
  Clock,
  Camera,
  Eye,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import type { Delivery, OrderItem as OrderItemType } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import Image from "next/image";

const DeliveryCard = React.memo(
  ({
    delivery,
    onSelect,
  }: {
    delivery: Delivery;
    onSelect: (delivery: Delivery) => void;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(delivery)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-lg">{delivery.truck?.placa}</p>
            <p className="text-sm text-muted-foreground">
              Despacho ID: {delivery.id}
            </p>
          </div>
          <Badge
            variant={delivery.estado === "CARGADA" ? "default" : "secondary"}
          >
            {delivery.order?.items?.length || 1} item(s)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.loadPhoto && (
          <div className="relative h-40 w-full overflow-hidden rounded-md border group">
            <Image
              src={delivery.loadPhoto}
              alt={`Foto de carga para ${delivery.truck?.placa}`}
              fill
              style={{ objectFit: "cover" }}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{delivery.order?.client?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chofer:</span>
            <span>{delivery.truck?.driver?.name || "N/A"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
);
DeliveryCard.displayName = "DeliveryCard";

interface LoadedItem {
  pedido_item_id: string;
  dispatched_quantity: number;
}

export function YardDeliveriesClientUI({
  initialDeliveries,
}: {
  initialDeliveries: Delivery[];
}) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [loadedItems, setLoadedItems] = useState<LoadedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loadPhoto, setLoadPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedDelivery?.order?.items) {
      const initialItems = selectedDelivery.order.items.map(
        (item: OrderItemType) => ({
          pedido_item_id: item.id,
          dispatched_quantity: item.cantidadSolicitadaBase,
        })
      );
      setLoadedItems(initialItems);
    }
  }, [selectedDelivery]);

  const handleLoadedQuantityChange = (
    pedido_item_id: string,
    quantity: number
  ) => {
    setLoadedItems((prev) =>
      prev.map((item) =>
        item.pedido_item_id === pedido_item_id
          ? { ...item, dispatched_quantity: quantity }
          : item
      )
    );
  };

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(
      (d) =>
        (d.truck?.placa?.toLowerCase() ?? "").includes(query) ||
        (d.id?.toString() ?? "").includes(query) ||
        (d.order?.client?.name?.toLowerCase() ?? "").includes(query)
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.estado === "PENDING"),
    [filteredDeliveries]
  );
  const loadedDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.estado === "CARGADA"),
    [filteredDeliveries]
  );

  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    if (delivery.estado !== "PENDING") {
      toast.info("Este despacho ya fue procesado.", {
        description: `Estado actual: ${delivery.estado}`,
      });
      return;
    }
    setSelectedDelivery(delivery);
    setNotes(delivery.notes || "");
    setLoadPhoto(null);
    setShowModal(true);
  }, []);

  const handleConfirmLoad = useCallback(async () => {
    if (!selectedDelivery || !loadPhoto) {
      toast.error("La foto de carga es obligatoria.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("status", "CARGADA");
      formData.append("notes", notes);
      formData.append("items", JSON.stringify(loadedItems));
      if (user?.id) formData.append("userId", user.id);
      formData.append("photoFile", loadPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const updatedDelivery = await res.json();
      setDeliveries((prev) =>
        prev.map((d) => (d.id === selectedDelivery.id ? updatedDelivery : d))
      );

      toast.success(`Carga confirmada para ${selectedDelivery.truck?.placa}`);
      setShowModal(false);
    } catch (err: any) {
      toast.error("Error al confirmar la carga", { description: err.message });
    } finally {
      setIsSubmitting(false);
      setSelectedDelivery(null);
    }
  }, [selectedDelivery, loadedItems, loadPhoto, notes, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gestión de Patio</h2>
        <p className="text-muted-foreground">
          Confirma la carga de los viajes asignados.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Buscar por placa, ID o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Pendientes por Cargar
            <Badge variant="secondary">{pendingDeliveries.length}</Badge>
          </h3>
          {pendingDeliveries.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              onSelect={handleSelectDelivery}
            />
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Cargados (Listos para Salir)
            <Badge variant="secondary">{loadedDeliveries.length}</Badge>
          </h3>
          {loadedDeliveries.map((d) => (
            <DeliveryCard key={d.id} delivery={d} onSelect={() => {}} />
          ))}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Confirmar Carga: {selectedDelivery?.truck?.placa}
            </DialogTitle>
            <DialogDescription>
              Ingresa la cantidad real cargada para cada producto.
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">
                      {selectedDelivery.order?.client?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pedido N°:</span>
                    <span className="font-medium">
                      {selectedDelivery.order?.orderNumber}
                    </span>
                  </div>
                </div>
                <div>
                  <PhotoInput
                    onSelect={setLoadPhoto}
                    required={true}
                    label="Foto de Carga (Obligatoria)"
                    capture={true}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Items del Pedido</Label>
                <div className="border rounded-lg">
                  {selectedDelivery.order?.items?.map(
                    (item: OrderItemType, index: number) => (
                      <div
                        key={item.id}
                        className={`p-3 grid grid-cols-3 gap-4 items-center ${
                          index > 0 ? "border-t" : ""
                        }`}
                      >
                        <div className="col-span-1">
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Pedido: {item.cantidadSolicitadaBase}{" "}
                            {item.product?.unit}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <Label
                            htmlFor={`item-${item.id}`}
                            className="text-xs mb-1"
                          >
                            Cantidad Real Cargada *
                          </Label>
                          <Input
                            id={`item-${item.id}`}
                            type="number"
                            value={
                              loadedItems.find(
                                (li) => li.pedido_item_id === item.id
                              )?.dispatched_quantity || ""
                            }
                            onChange={(e) =>
                              handleLoadedQuantityChange(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            required
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (Opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones de la carga..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmLoad} disabled={isSubmitting}>
                  {isSubmitting ? "Procesando..." : "Confirmar Carga"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
