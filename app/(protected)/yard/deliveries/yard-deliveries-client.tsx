// app/(protected)/yard/deliveries/yard-deliveries-client.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoInput } from "@/components/forms/photo-input";
import { Search, Truck, Package, User, CheckCircle, Clock, Loader, Camera, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Delivery } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";

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
        d.truck?.placa.toLowerCase().includes(query) || 
        d.id.toLowerCase().includes(query) || 
        d.order?.client?.nombre.toLowerCase().includes(query)
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "ASIGNADA"), [filteredDeliveries]);
  const loadingDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "EN_CARGA"), [filteredDeliveries]);
  const loadedDeliveries = useMemo(() => filteredDeliveries.filter((d) => d.estado === "CARGADA"), [filteredDeliveries]);

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setLoadedQuantity(delivery.loadedQuantity || delivery.cantidadBase);
    setNotes(delivery.notes || "");
    setLoadPhoto(null);
    setShowModal(true);
  };
  
  const handleUpdateStatus = async (newStatus: "EN_CARGA" | "CARGADA") => {
    if (!selectedDelivery) return;

    if (newStatus === 'CARGADA' && (!loadedQuantity || loadedQuantity <= 0)) {
        toast.error("La cantidad cargada debe ser mayor a cero.");
        return;
    }
    
    setIsSubmitting(true);
    const originalDeliveries = deliveries;
    const updatedDeliveries = deliveries.map(d => d.id === selectedDelivery.id ? { ...d, estado: newStatus } : d);
    setDeliveries(updatedDeliveries);
    setShowModal(false);

    try {
      const formData = new FormData();
      formData.append('estado', newStatus);
      formData.append('notes', notes);
      if (loadedQuantity) formData.append('loadedQuantity', loadedQuantity.toString());
      if (user?.id) formData.append('userId', user.id);
      if (loadPhoto) formData.append('photoFile', loadPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, { method: 'PATCH', body: formData });

      if (!res.ok) throw new Error(await res.text());
      
      const updatedDelivery = await res.json();
      
      setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));

      toast.success(`Viaje ${updatedDelivery.truck.placa} actualizado a "${newStatus}"`);
    } catch (err: any) {
      setDeliveries(originalDeliveries);
      toast.error("Error al actualizar el estado", { description: err.message });
    } finally {
      setIsSubmitting(false);
      setSelectedDelivery(null);
    }
  };
  
  const openImagePreview = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  };

  const DeliveryCard = ({ delivery }: { delivery: Delivery }) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectDelivery(delivery)}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex justify-between items-start">
          <div><p className="font-bold text-lg">{delivery.truck?.placa}</p><p className="text-sm text-muted-foreground">ID: {delivery.id}</p></div>
          <Badge variant="secondary">{delivery.productFormat?.product?.nombre}</Badge>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="truncate">{delivery.order?.client?.nombre}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cantidad:</span><span className="font-medium">{delivery.cantidadBase} {delivery.productFormat?.unidadBase}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Chofer:</span><span>{delivery.truck?.driver?.nombre || "N/A"}</span></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gestión de Patio</h2>
        <p className="text-muted-foreground">Controla el proceso de carga de los viajes asignados</p>
      </div>
      <Card><CardContent className="pt-6"><Input placeholder="Buscar por placa, ID de viaje o cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4"><h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" />Pendientes<Badge variant="secondary">{pendingDeliveries.length}</Badge></h3>{pendingDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} />)}</div>
        <div className="space-y-4"><h3 className="font-semibold flex items-center gap-2"><Loader className="h-5 w-5 text-yellow-500 animate-spin" />En Carga<Badge variant="secondary">{loadingDeliveries.length}</Badge></h3>{loadingDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} />)}</div>
        <div className="space-y-4"><h3 className="font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Cargados<Badge variant="secondary">{loadedDeliveries.length}</Badge></h3>{loadedDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} />)}</div>
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestionar Viaje: {selectedDelivery?.truck?.placa}</DialogTitle><DialogDescription>Actualiza el estado y la información de carga.</DialogDescription></DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span>Cliente:</span><span className="font-medium">{selectedDelivery.order?.client?.nombre}</span></div>
                <div className="flex justify-between"><span>Producto:</span><span className="font-medium">{selectedDelivery.productFormat?.product?.nombre}</span></div>
                <div className="flex justify-between"><span>Cantidad Pedida:</span><span className="font-medium">{selectedDelivery.cantidadBase} {selectedDelivery.productFormat?.unidadBase}</span></div>
              </div>
              <div className="space-y-2"><Label>Cantidad Cargada</Label><Input type="number" value={loadedQuantity} onChange={e => setLoadedQuantity(parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones de la carga..." /></div>
              <div className="space-y-2"><Label className="flex items-center gap-2"><Camera className="h-4 w-4" />Foto de Carga</Label><PhotoInput onSelect={setLoadPhoto} capture={true} /></div>
              {selectedDelivery.loadPhoto && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden group border">
                    <img src={selectedDelivery.loadPhoto} alt="Foto de carga" className="w-full h-full object-cover" />
                    <Button type="button" variant="ghost" size="icon" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => openImagePreview(selectedDelivery.loadPhoto!)}><Eye className="h-6 w-6 text-white" /></Button>
                  </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                {selectedDelivery.estado === "ASIGNADA" && <Button onClick={() => handleUpdateStatus("EN_CARGA")} disabled={isSubmitting}>Iniciar Carga</Button>}
                {selectedDelivery.estado === "EN_CARGA" && <Button onClick={() => handleUpdateStatus("CARGADA")} disabled={isSubmitting}>Finalizar Carga</Button>}
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
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