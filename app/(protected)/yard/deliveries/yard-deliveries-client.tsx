"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import type { Delivery, Order, OrderItem as OrderItemType, Truck as TruckType, Driver, DeliveryItem } from "@/lib/types";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoInput } from "@/components/forms/photo-input";
import { Plus, CheckCircle, Clock, User, Truck as TruckIcon } from "lucide-react";

// --- Type Definitions ---
interface LoadedItem {
  pedido_item_id: string;
  dispatched_quantity: number;
}

interface DisplayOrderItem extends OrderItemType {
  pending_quantity: number;
}

interface YardClientProps {
  initialDeliveries: Delivery[];
  initialActiveOrders: Order[];
  initialTrucks: TruckType[];
  initialDrivers: Driver[];
}

const DeliveryCard = React.memo(({ delivery, onSelect }: { delivery: Delivery; onSelect: (delivery: Delivery) => void; }) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelect(delivery)}>
        <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg flex items-center gap-2"><TruckIcon className="h-5 w-5" /> {delivery.truck.placa}</p>
                    <p className="text-sm text-muted-foreground">Despacho ID: {delivery.delivery_id}</p>
                </div>
                <Badge variant={delivery.estado === "CARGADA" ? "default" : "secondary"}>
                    Pedido #{delivery.orderDetails.order_number}
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Conductor:</span>
                <span className="truncate">{delivery.driver.name}</span>
            </div>
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Cliente:</span>
                <span className="truncate">{delivery.orderDetails.client.name}</span>
            </div>
            {delivery.loadPhoto && (
                <div className="relative h-40 w-full overflow-hidden rounded-md border group mt-2">
                    <Image src={delivery.loadPhoto} alt={`Foto de carga`} fill style={{ objectFit: "cover" }} className="transition-transform duration-300 group-hover:scale-105" />
                </div>
            )}
        </CardContent>
    </Card>
));
DeliveryCard.displayName = "DeliveryCard";


// --- Main Client Component ---
export function YardDeliveriesClientUI({
  initialDeliveries,
  initialActiveOrders,
  initialTrucks,
  initialDrivers,
}: YardClientProps) {
  const { user } = useAuth();
  
  // --- State Management ---
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Create Trip Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Confirm Load Modal State
  const [loadedItems, setLoadedItems] = useState<LoadedItem[]>([]);
  const [displayOrderItems, setDisplayOrderItems] = useState<DisplayOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loadPhoto, setLoadPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Derived State (Memoized for Performance) ---
  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(d =>
        (d.truck.placa?.toLowerCase() ?? "").includes(query) ||
        (d.driver.name?.toLowerCase() ?? "").includes(query) ||
        (d.orderDetails.client.name?.toLowerCase() ?? "").includes(query) ||
        (d.delivery_id.toString() ?? "").includes(query)
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "PENDING"), [filteredDeliveries]);
  const loadedDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "CARGADA"), [filteredDeliveries]);

  // --- Callbacks and Event Handlers ---
  const handleCreateTrip = useCallback(async () => {
    if (!selectedOrderId || !selectedTruckId || !selectedDriverId) {
      toast.error("Debes seleccionar pedido, camión y conductor.");
      return;
    }
    setIsCreatingTrip(true);
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // El backend espera order_id, no orderId
          order_id: parseInt(selectedOrderId),
          truck_id: parseInt(selectedTruckId),
          driver_id: parseInt(selectedDriverId),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const newDelivery = await res.json();
      setDeliveries((prev) => [newDelivery, ...prev]);
      toast.success(`Nuevo viaje (Despacho #${newDelivery.id}) creado con éxito.`);
      setSelectedOrderId('');
      setSelectedTruckId('');
      setSelectedDriverId('');
    } catch (err: any) {
      toast.error("Error al crear el viaje", { description: err.message });
    } finally {
      setIsCreatingTrip(false);
    }
  }, [selectedOrderId, selectedTruckId, selectedDriverId]);

  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    if (delivery.estado !== "PENDING") {
      toast.info("Este despacho ya fue procesado.", { description: `Estado actual: ${delivery.estado}` });
      return;
    }
    setSelectedDelivery(delivery);
    
    const itemsWithPendingQty = delivery.orderDetails.items?.map(item => {
        const dispatched = item.dispatchItems?.reduce((sum: number, di: DeliveryItem) => sum + di.dispatched_quantity, 0) || 0;
        return {
            ...item,
            pending_quantity: item.quantity - dispatched,
        };
    }) || [];
    
    setDisplayOrderItems(itemsWithPendingQty);
    
    const initialLoadedItems = itemsWithPendingQty.map(item => ({
        pedido_item_id: item.id.toString(),
        dispatched_quantity: 0,
    }));
    
    setLoadedItems(initialLoadedItems);
    setNotes(delivery.notes || "");
    setLoadPhoto(null);
    setShowModal(true);
  }, []);
  
  const handleLoadedQuantityChange = (pedido_item_id: string, newQuantity: number) => {
      const item = displayOrderItems.find(i => i.id.toString() === pedido_item_id);
      if (!item) return;
      
      const validatedQuantity = Math.max(0, Math.min(newQuantity, item.pending_quantity));
      
      setLoadedItems((prev) => prev.map(li => 
          li.pedido_item_id === pedido_item_id 
              ? { ...li, dispatched_quantity: validatedQuantity } 
              : li
      ));
  };

  const handleConfirmLoad = useCallback(async () => {
    if (!selectedDelivery || !user?.id) return;
    if (!loadPhoto) {
      toast.error("La foto de carga es obligatoria.");
      return;
    }
    
    const itemsToDispatch = loadedItems.filter(item => item.dispatched_quantity > 0);
    
    if (itemsToDispatch.length === 0) {
        toast.warning("Debes ingresar una cantidad a cargar mayor a cero para al menos un item.");
        return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("status", "CARGADA");
      formData.append("notes", notes);
      formData.append("itemsJson", JSON.stringify(itemsToDispatch));
      formData.append("userId", user.id);
      formData.append("photoFile", loadPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.delivery_id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const updatedDelivery = await res.json();
      
      setDeliveries((prev) => prev.map((d) => (d.delivery_id === selectedDelivery.delivery_id ? updatedDelivery : d)));      
      
      toast.success(`Carga confirmada para ${selectedDelivery.truck.placa}`);
      setShowModal(false);
    } catch (err: any) {
      toast.error("Error al confirmar la carga", { description: err.message });
    } finally {
      setIsSubmitting(false);
      setSelectedDelivery(null);
    }
  }, [selectedDelivery, loadedItems, loadPhoto, notes, user?.id]);

  // --- Render Method ---
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gestión de Patio</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Iniciar Nuevo Viaje</CardTitle>
          <CardDescription>Selecciona un pedido, camión y conductor para crear un nuevo despacho.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="order-select">Pedido Activo</Label>
            <Select onValueChange={setSelectedOrderId} value={selectedOrderId}>
              <SelectTrigger id="order-select"><SelectValue placeholder="Seleccionar Pedido..." /></SelectTrigger>
              <SelectContent>{initialActiveOrders.map(o => <SelectItem key={o.id} value={o.id.toString()}>#{o.order_number} - {o.client.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truck-select">Camión Disponible</Label>
            <Select onValueChange={setSelectedTruckId} value={selectedTruckId} disabled={!selectedOrderId}>
              <SelectTrigger id="truck-select"><SelectValue placeholder="Seleccionar Camión..." /></SelectTrigger>
              <SelectContent>{initialTrucks.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.placa}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver-select">Conductor</Label>
            <Select onValueChange={setSelectedDriverId} value={selectedDriverId} disabled={!selectedOrderId}>
              <SelectTrigger id="driver-select"><SelectValue placeholder="Seleccionar Conductor..." /></SelectTrigger>
              <SelectContent>{initialDrivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateTrip} disabled={!selectedOrderId || !selectedTruckId || !selectedDriverId || isCreatingTrip}>
            {isCreatingTrip ? "Creando..." : <><Plus className="h-4 w-4 mr-2" /> Crear Viaje</>}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <Input placeholder="Buscar por placa, conductor, cliente o ID de despacho..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" /> Pendientes por Cargar <Badge variant="secondary">{pendingDeliveries.length}</Badge></h3>
          {pendingDeliveries.length > 0 ? pendingDeliveries.map((d) => <DeliveryCard key={d.delivery_id} delivery={d} onSelect={handleSelectDelivery} />) : <p className="text-sm text-muted-foreground pt-4">No hay viajes pendientes.</p>}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Cargados (Listos para Salir) <Badge variant="secondary">{loadedDeliveries.length}</Badge></h3>
          {loadedDeliveries.length > 0 ? loadedDeliveries.map((d) => <DeliveryCard key={d.delivery_id} delivery={d} onSelect={() => toast.info(`El despacho #${d.delivery_id} ya está cargado y listo para salir.`)} />) : <p className="text-sm text-muted-foreground pt-4">No hay viajes cargados.</p>}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDelivery && (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar Carga: {selectedDelivery.truck.placa}</DialogTitle>
                {/* ✅ CORREGIDO: Se usa orderDetails en lugar de order */}
                <DialogDescription>Ingresa la cantidad real cargada para cada producto de la orden #{selectedDelivery.orderDetails.order_number}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      {/* ✅ CORREGIDO: Se usa orderDetails en lugar de order */}
                      <p><strong>Cliente:</strong> {selectedDelivery.orderDetails.client.name}</p>
                      <p><strong>Conductor:</strong> {selectedDelivery.driver.name}</p>
                  </div>
                  <PhotoInput onSelect={setLoadPhoto} required={true} label="Foto de Carga (Obligatoria)" capture={true} />
                </div>

                <div className="space-y-2">
                  <Label>Items del Pedido</Label>
                  <div className="border rounded-lg">
                    {displayOrderItems.map((item, index) => {
                      const dispatched = item.quantity - item.pending_quantity;
                      const loadedValue = loadedItems.find(li => li.pedido_item_id === item.id.toString())?.dispatched_quantity;
                      
                      return (
                        <div key={item.id} className={`p-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-center ${index > 0 ? "border-t" : ""}`}>
                          <div className="col-span-1 md:col-span-1 space-y-1">
                            <p className="font-medium">{item.product.name}</p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>Pedido: <span className="font-bold">{item.quantity}</span> {item.product.unit}</p>
                                <p>Despachado: <span className="font-bold text-blue-600">{dispatched.toFixed(2)}</span> {item.product.unit}</p>
                                <p>Pendiente: <span className="font-bold text-green-600">{item.pending_quantity.toFixed(2)}</span> {item.product.unit}</p>
                            </div>
                          </div>
                          
                          <div className="col-span-1 md:col-span-2">
                            <Label htmlFor={`item-${item.id}`} className="text-xs mb-1">Cantidad a Cargar en este Viaje *</Label>
                            <Input 
                                id={`item-${item.id}`} 
                                type="number" 
                                value={loadedValue ?? 0}
                                onChange={(e) => handleLoadedQuantityChange(item.id.toString(), parseFloat(e.target.value) || 0)} 
                                max={item.pending_quantity}
                                min={0}
                                required 
                                className="text-lg"
                                disabled={item.pending_quantity <= 0}
                            />
                            {item.pending_quantity <= 0 && <p className="text-xs text-green-700 mt-1">Este item ya fue despachado por completo.</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas (Opcional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones de la carga..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmLoad} disabled={isSubmitting}>{isSubmitting ? "Procesando..." : "Confirmar Carga"}</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}