// app/(protected)/yard/deliveries/yard-deliveries-client.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoInput } from "@/components/forms/photo-input";
import { Search, Truck, User, CheckCircle, Clock, Camera, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Delivery } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import Image from "next/image";

// OPTIMIZACIÓN: Se extrae DeliveryCard a su propio componente y se envuelve con React.memo.
// Esto evita que todas las tarjetas se vuelvan a renderizar si solo una cambia o si el componente padre se actualiza.
const DeliveryCard = React.memo(({ delivery, onSelect }: { delivery: Delivery; onSelect: (delivery: Delivery) => void; }) => (
  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelect(delivery)}>
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <div><p className="font-bold text-lg">{delivery.truck?.placa}</p><p className="text-sm text-muted-foreground">ID: {delivery.id}</p></div>
        <Badge variant="secondary">{delivery.product?.nombre}</Badge>
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
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white bg-black/50 px-2 py-1 rounded">
                  <Camera className="h-3 w-3" />
                  <span>Foto de Carga</span>
              </div>
          </div>
      )}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="truncate">{delivery.order?.client?.nombre}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Cantidad:</span><span className="font-medium">{delivery.cantidadBase} {delivery.cantidadBase}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Chofer:</span><span>{delivery.truck?.driver?.nombre || "N/A"}</span></div>
      </div>
    </CardContent>
  </Card>
));
DeliveryCard.displayName = 'DeliveryCard';


export function YardDeliveriesClientUI({ initialDeliveries }: { initialDeliveries: Delivery[] }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadedQuantity, setLoadedQuantity] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [loadPhoto, setLoadPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);


  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(d => 
        (d.truck?.placa?.toLowerCase() ?? '').includes(query) || 
        (d.id?.toLowerCase() ?? '').includes(query) || 
        (d.order?.client?.nombre?.toLowerCase() ?? '').includes(query)
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "ASIGNADA"), [filteredDeliveries]);
  const loadedDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "CARGADA"), [filteredDeliveries]);

  // OPTIMIZACIÓN: Memorizamos la función para que no se recree en cada render.
  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    if (delivery.estado !== 'ASIGNADA') {
        toast.info("Este viaje ya fue procesado.", {
            description: `Estado actual: ${delivery.estado}`
        })
        return;
    }
    setSelectedDelivery(delivery);
    setLoadedQuantity(delivery.cantidadBase); // Inicia con la cantidad solicitada
    setNotes(delivery.notes || "");
    setLoadPhoto(null);
    setShowModal(true);
  }, []);
  
  // OPTIMIZACIÓN: Memorizamos la función.
  const handleConfirmLoad = useCallback(async () => {
    if (!selectedDelivery) return;

    if (!loadedQuantity || loadedQuantity <= 0) {
        toast.error("La cantidad cargada debe ser un número mayor a cero.");
        return;
    }
     if (!loadPhoto) {
      toast.error("La foto de carga es obligatoria para confirmar.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('estado', 'CARGADA');
      formData.append('notes', notes);
      formData.append('loadedQuantity', loadedQuantity.toString());
      if (user?.id) formData.append('userId', user.id);
      if (loadPhoto) formData.append('photoFile', loadPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, { method: 'PATCH', body: formData });

      if (!res.ok) throw new Error(await res.text());
      
      const updatedDelivery = await res.json();
      
      setDeliveries(prev => prev.map(d => d.id === selectedDelivery.id ? { ...d, ...updatedDelivery, estado: 'CARGADA', loadedQuantity } : d));
      
      toast.success(`Carga confirmada para ${selectedDelivery.truck?.placa}`);
      setShowModal(false);

    } catch (err: any) {
      toast.error("Error al confirmar la carga", { description: err.message });
    } finally {
      setIsSubmitting(false);
      setSelectedDelivery(null);
    }
  }, [selectedDelivery, loadedQuantity, loadPhoto, notes, user?.id]);
  
  // OPTIMIZACIÓN: Memorizamos la función.
  const openImagePreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  }, []);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gestión de Patio</h2>
        <p className="text-muted-foreground">Confirma la carga de los viajes asignados.</p>
      </div>
      <Card><CardContent className="pt-6"><Input placeholder="Buscar por placa, ID de viaje o cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4"><h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" />Pendientes por Cargar<Badge variant="secondary">{pendingDeliveries.length}</Badge></h3>{pendingDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} onSelect={handleSelectDelivery} />)}</div>
        <div className="space-y-4"><h3 className="font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Cargados (Listos para Salir)<Badge variant="secondary">{loadedDeliveries.length}</Badge></h3>{loadedDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} onSelect={handleSelectDelivery} />)}</div>
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirmar Carga: {selectedDelivery?.truck?.placa}</DialogTitle><DialogDescription>Ingresa la cantidad real cargada y adjunta una foto como evidencia.</DialogDescription></DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span>Cliente:</span><span className="font-medium">{selectedDelivery.order?.client?.nombre}</span></div>
                <div className="flex justify-between"><span>Producto:</span><span className="font-medium">{selectedDelivery.product?.nombre}</span></div>
                <div className="flex justify-between"><span>Cantidad Pedida:</span><span className="font-medium">{selectedDelivery.cantidadBase} {selectedDelivery.cantidadBase}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><Eye className="h-4 w-4" />Foto de Cajero</h4>{selectedDelivery.loadPhoto ? (<div className="relative w-full h-48 rounded-lg overflow-hidden group border"><img src={selectedDelivery.loadPhoto || "/placeholder.svg"} alt="Foto de carga del cajero" className="w-full h-full object-cover" /><Button type="button" variant="ghost" size="icon" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => openImagePreview(selectedDelivery.loadPhoto!)}><Eye className="h-8 w-8 text-white" /></Button></div>) : (<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center h-48 flex flex-col items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Sin foto de cajero</p></div>)}</div>
                  <div><PhotoInput onSelect={setLoadPhoto} required={true} label="Foto de Carga (Obligatoria)" capture={true} /><p className="text-sm text-muted-foreground mt-2">Placa visible en la foto</p></div>
              </div>
              <div className="space-y-2"><Label htmlFor="loadedQuantity">Cantidad Real Cargada *</Label><Input id="loadedQuantity" type="number" value={loadedQuantity} onChange={e => setLoadedQuantity(parseFloat(e.target.value) || 0)} required/></div>
              <div className="space-y-2"><Label>Notas (Opcional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones de la carga..." /></div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button onClick={handleConfirmLoad} disabled={isSubmitting}>Confirmar Carga</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
            <DialogContent className="max-w-3xl p-0"><DialogHeader><DialogTitle className="sr-only">Vista Previa de la Imagen</DialogTitle></DialogHeader>{previewImageUrl && (<img src={previewImageUrl} alt="Vista previa" className="w-full h-auto max-h-[90vh] object-contain" />)}</DialogContent>
        </Dialog>
    </div>
  );
}

