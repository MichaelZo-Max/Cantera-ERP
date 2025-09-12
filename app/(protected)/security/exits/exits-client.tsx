// app/(protected)/security/exits/exits-client.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoInput } from "@/components/forms/photo-input";
import {
  Search,
  Shield,
  Truck,
  Package,
  User,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Camera,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { Delivery, OrderItem } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import Image from "next/image";

const LoadedDeliveryCard = React.memo(({ delivery, onSelect }: { delivery: Delivery; onSelect: (delivery: Delivery) => void; }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10" onClick={() => onSelect(delivery)}>
        <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-3">
                <div><p className="font-bold text-lg">{delivery.truck?.placa}</p><p className="text-sm text-muted-foreground">ID: {delivery.id}</p></div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Listo para Salir</Badge>
            </div>
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="truncate">{delivery.order?.client?.nombre}</span></div>
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {delivery.order?.items && delivery.order.items.length > 0
                      ? `${delivery.order.items[0].product?.nombre} ${delivery.order.items.length > 1 ? `y ${delivery.order.items.length - 1} más...` : ''}`
                      : "Sin items"}
                  </span>
                </div>
                {delivery.loadedAt && <div className="flex justify-between"><span className="text-muted-foreground">Cargado:</span><span>{new Date(delivery.loadedAt).toLocaleTimeString()}</span></div>}
            </div>
            <Button className="w-full mt-3" size="sm"><LogOut className="h-4 w-4 mr-2" />Autorizar Salida</Button>
        </CardContent>
    </Card>
));
LoadedDeliveryCard.displayName = 'LoadedDeliveryCard';

const ExitedDeliveryCard = React.memo(({ delivery }: { delivery: Delivery }) => (
     <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-3">
                <div><p className="font-semibold">{delivery.truck?.placa}</p><p className="text-sm text-muted-foreground">{delivery.order?.client?.nombre}</p></div>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Salió</Badge>
            </div>
            <div className="text-sm space-y-1">
                {delivery.order?.items && delivery.order.items.length > 0 &&
                  <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />
                    <span>{delivery.order.items[0].product?.nombre} {delivery.order.items.length > 1 ? `y más...` : ''}</span>
                  </div>
                }
                {delivery.exitedAt && <div className="flex justify-between"><span className="text-muted-foreground">Salida:</span><span>{new Date(delivery.exitedAt).toLocaleTimeString()}</span></div>}
            </div>
        </CardContent>
    </Card>
));
ExitedDeliveryCard.displayName = 'ExitedDeliveryCard';


export function SecurityExitsClientUI({ initialDeliveries }: { initialDeliveries: Delivery[] }) {
  const { user } = useAuth();
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>(initialDeliveries);
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPhoto, setExitPhoto] = useState<File | null>(null);
  const [exitNotes, setExitNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadedDeliveries = useMemo(() => allDeliveries.filter((d) => d.estado === "CARGADA"), [allDeliveries]);
  const exitedDeliveries = useMemo(() => allDeliveries.filter((d) => d.estado === "SALIDA_OK"), [allDeliveries]);

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return loadedDeliveries;
    return loadedDeliveries.filter((delivery) => {
      return (
        (delivery.truck?.placa || '').toLowerCase().includes(query) ||
        delivery.id.toLowerCase().includes(query) ||
        (delivery.order?.client?.nombre || '').toLowerCase().includes(query)
      );
    });
  }, [searchQuery, loadedDeliveries]);

  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    if (delivery.estado !== "CARGADA") {
      toast.error("El viaje no está cargado y listo para salir.");
      return;
    }
    setSelectedDelivery(delivery);
    setExitPhoto(null);
    setExitNotes("");
    setShowExitModal(true);
  }, []);

  const handleAuthorizeExit = useCallback(async () => {
    if (!selectedDelivery || !exitPhoto) {
      toast.error("La foto de salida es obligatoria.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('status', 'SALIDA_OK');
      formData.append('notes', exitNotes);
      if (user?.id) formData.append('userId', user.id);
      if (exitPhoto) formData.append('photoFile', exitPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, { method: 'PATCH', body: formData });
      if (!res.ok) throw new Error(await res.text());
      
      const updatedDeliveryData = await res.json();
      setAllDeliveries(prev => prev.map(d => d.id === selectedDelivery.id ? { ...d, ...updatedDeliveryData } : d));
      
      const guideNumber = `GD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      toast.success("Salida autorizada", { description: `Guía de despacho ${guideNumber} generada para ${selectedDelivery.truck?.placa}` });
      setShowExitModal(false);

    } catch (error: any) {
        toast.error("Error al autorizar la salida.", { description: error.message });
    } finally {
      setIsSubmitting(false);
      setSelectedDelivery(null);
      setExitPhoto(null);
      setExitNotes("");
    }
  }, [selectedDelivery, exitPhoto, exitNotes, user?.id]);

  const handleCloseModal = useCallback(() => {
    setShowExitModal(false);
    setSelectedDelivery(null);
    setPreviewImageUrl(null);
  }, []);

  const openImagePreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  }, []);

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Salida</h2>
          <p className="text-muted-foreground">Autoriza la salida de camiones cargados</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Búsqueda Rápida</CardTitle><CardDescription>Busca por placa, ID de viaje o cliente</CardDescription></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input placeholder="Buscar por placa (ABC-12D), ID de viaje o cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-lg" />
              <Button variant="outline" onClick={() => setSearchQuery("")}>Limpiar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-green-600" />Viajes Listos para Salir<Badge variant="secondary">{filteredDeliveries.length}</Badge></CardTitle><CardDescription>Camiones cargados esperando autorización de salida</CardDescription></CardHeader>
          <CardContent>
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-8"><Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">{searchQuery ? "No se encontraron viajes con esa búsqueda" : "No hay viajes listos para salir"}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeliveries.map((delivery) => (
                  <LoadedDeliveryCard key={delivery.id} delivery={delivery} onSelect={handleSelectDelivery} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {exitedDeliveries.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-blue-600" />Salidas Recientes<Badge variant="secondary">{exitedDeliveries.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exitedDeliveries.map((delivery) => (
                  <ExitedDeliveryCard key={delivery.id} delivery={delivery} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4"><DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-green-600" />Autorizar Salida - {selectedDelivery?.truck?.placa}</DialogTitle><DialogDescription>Verifica la información y toma foto de la placa para autorizar la salida</DialogDescription></DialogHeader>
            {selectedDelivery && (
              <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Items Cargados:</p>
                    <div className="border rounded-lg space-y-2 p-2 bg-muted/30">
                      {selectedDelivery.order?.items?.map((item: OrderItem) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.product?.nombre} ({item.cantidadSolicitadaBase} {item.product?.unit})</span>
                          <span className="font-medium">{/* Aquí iría la cantidad cargada si la tuviéramos */}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><Eye className="h-4 w-4" />Foto del Patio</h4>{selectedDelivery.loadPhoto ? (<div className="relative w-full h-48 rounded-lg overflow-hidden group border"><Image src={selectedDelivery.loadPhoto || "/placeholder.svg"} alt="Foto de carga del patio" fill style={{objectFit: 'cover'}} /><Button type="button" variant="ghost" size="icon" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => openImagePreview(selectedDelivery.loadPhoto!)}><Eye className="h-8 w-8 text-white" /></Button></div>) : (<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center h-48 flex flex-col items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Sin foto</p></div>)}</div>
                  <div><PhotoInput onSelect={setExitPhoto} required={true} label="Foto de salida (obligatoria)" capture={true} /><p className="text-sm text-muted-foreground mt-2">Placa visible en la foto</p></div>
                </div>
                {selectedDelivery.notes && (<div className="p-2 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg"><p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Notas del Patio:</p><p className="text-xs text-yellow-700 dark:text-yellow-400">{selectedDelivery.notes}</p></div>)}
                <div className="space-y-2"><Label className="text-sm">Observaciones de Seguridad</Label><Textarea value={exitNotes} onChange={(e) => setExitNotes(e.target.value)} placeholder="Documentos OK, condición del vehículo..." rows={2} className="text-sm" /></div>
                {selectedDelivery.estado !== "CARGADA" && (<Alert variant="destructive" className="py-2"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-sm">Este viaje no está cargado. Solo se pueden autorizar viajes cargados.</AlertDescription></Alert>)}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleAuthorizeExit} disabled={isSubmitting || !exitPhoto || selectedDelivery.estado !== "CARGADA"} className="flex-1" size="sm"><FileText className="h-4 w-4 mr-2" />{isSubmitting ? "Procesando..." : "Salida OK - Generar Guía"}</Button>
                  <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting} size="sm">Cancelar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
            <DialogContent className="max-w-3xl p-0"><DialogHeader><DialogTitle className="sr-only">Vista Previa de la Imagen</DialogTitle></DialogHeader>{previewImageUrl && (<Image src={previewImageUrl} alt="Vista previa" width={1200} height={900} className="w-full h-auto max-h-[90vh] object-contain" />)}</DialogContent>
        </Dialog>
      </div>
  );
}