"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Box,
} from "lucide-react";
import { toast } from "sonner";
import type { Delivery, DeliveryItem } from "@/lib/types"; // CORREGIDO: Importa DeliveryItem

// --- SUB-COMPONENTES (Actualizados con las propiedades correctas) ---

const LoadedDeliveryCard = React.memo(
  ({
    delivery,
    onSelect,
  }: {
    delivery: Delivery;
    onSelect: (delivery: Delivery) => void;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10 flex flex-col justify-between"
      onClick={() => onSelect(delivery)}
    >
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold text-lg">{delivery.truck?.placa}</p>
            {/* CORREGIDO: usa delivery_id */}
            <p className="text-sm text-muted-foreground">Despacho ID: {delivery.delivery_id}</p>
          </div>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Listo para Salir
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {/* CORREGIDO: usa orderDetails */}
            <span className="truncate">{delivery.orderDetails?.client?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
             {/* CORREGIDO: usa dispatchItems y orderDetails */}
            <span>
              {delivery.dispatchItems && delivery.dispatchItems.length > 0
                ? `${delivery.orderDetails.items.find(i => i.id === delivery.dispatchItems![0].pedido_item_id)?.product.name} ${
                    delivery.dispatchItems.length > 1
                      ? `y ${delivery.dispatchItems.length - 1} más...`
                      : ""
                  }`
                : "Sin items"}
            </span>
          </div>
          {delivery.loadedAt && (
            <div className="flex justify-between text-xs pt-1">
              <span className="text-muted-foreground">Cargado:</span>
              <span>{new Date(delivery.loadedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <Button className="w-full mt-3" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Autorizar Salida
        </Button>
      </div>
    </Card>
  )
);
LoadedDeliveryCard.displayName = "LoadedDeliveryCard";

const ExitedDeliveryCard = React.memo(({ delivery }: { delivery: Delivery }) => (
  <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
    <CardContent className="pt-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold">{delivery.truck?.placa}</p>
          <p className="text-sm text-muted-foreground">
            {/* CORREGIDO: usa orderDetails */}
            {delivery.orderDetails?.client?.name}
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          Salió
        </Badge>
      </div>
      <div className="text-sm space-y-1">
        {delivery.exitedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salida:</span>
            <span>{new Date(delivery.exitedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));
ExitedDeliveryCard.displayName = "ExitedDeliveryCard";


// --- COMPONENTE PRINCIPAL ---

export function SecurityExitsClientUI({
  initialDeliveries,
}: {
  initialDeliveries: Delivery[];
}) {
  const { user } = useAuth();
  const [allDeliveries, setAllDeliveries] =
    useState<Delivery[]>(initialDeliveries);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPhoto, setExitPhoto] = useState<File | null>(null);
  const [exitNotes, setExitNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Filtrado de despachos por estado
  const loadedDeliveries = useMemo(
    // CORREGIDO: usa estado
    () => allDeliveries.filter((d) => d.estado === "CARGADA"),
    [allDeliveries]
  );
  const exitedDeliveries = useMemo(
    // CORREGIDO: usa estado
    () => allDeliveries.filter((d) => d.estado === "EXITED"),
    [allDeliveries]
  );

  // Lógica de búsqueda
  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return loadedDeliveries;
    return loadedDeliveries.filter((delivery) => {
      // CORREGIDO: usa delivery_id y orderDetails
      const deliveryId = String(delivery.delivery_id);
      return (
        (delivery.truck?.placa || "").toLowerCase().includes(query) ||
        deliveryId.toLowerCase().includes(query) ||
        (delivery.orderDetails?.client?.name || "").toLowerCase().includes(query)
      );
    });
  }, [searchQuery, loadedDeliveries]);

  // Abre el modal de autorización
  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    // CORREGIDO: usa estado
    if (delivery.estado !== "CARGADA") {
      toast.warning("Este despacho no está listo para salir.");
      return;
    }
    setSelectedDelivery(delivery);
    setExitPhoto(null);
    setExitNotes("");
    setShowExitModal(true);
  }, []);
  
  // Cierra cualquier modal y resetea estados
  const handleCloseModals = useCallback(() => {
    setShowExitModal(false);
    setShowImagePreview(false);
    setSelectedDelivery(null);
    setPreviewImageUrl(null);
  }, []);

  // Procesa la autorización de salida
  const handleAuthorizeExit = useCallback(async () => {
    if (!selectedDelivery) return;
    if (!exitPhoto) {
      toast.error("La foto de salida es obligatoria.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("status", "EXITED"); 
      formData.append("notes", exitNotes);
      if (user?.id) formData.append("userId", user.id.toString());
      formData.append("photoFile", exitPhoto);

      // CORREGIDO: usa delivery_id
      const res = await fetch(`/api/deliveries/${selectedDelivery.delivery_id}`, {
        method: "PATCH",
        body: formData,
      });
      
      const responseBody = await res.text();
      if (!res.ok) {
        try {
          const errorJson = JSON.parse(responseBody);
          throw new Error(errorJson.error || "Error del servidor");
        } catch {
          throw new Error(responseBody || "Error al conectar con el servidor.");
        }
      }

      const updatedDelivery: Delivery = JSON.parse(responseBody);

      // Actualizar el estado local para reflejar el cambio inmediatamente
      setAllDeliveries((prev) =>
        prev.map((d) =>
          d.delivery_id === updatedDelivery.delivery_id ? updatedDelivery : d
        )
      );
      
      toast.success("Salida Autorizada Correctamente", {
        description: `Se generó la guía para la placa ${selectedDelivery.truck?.placa}.`,
      });
      handleCloseModals();

    } catch (error: any) {
      console.error("Error al autorizar la salida:", error);
      toast.error("No se pudo autorizar la salida.", {
        description: error.message || "Por favor, inténtelo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDelivery, exitPhoto, exitNotes, user?.id, handleCloseModals]);


  const openImagePreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  }, []);

  return (
    <div className="space-y-6">
       {/* UI (Sin cambios lógicos) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Control de Salida
          </h2>
          <p className="text-muted-foreground">
            Autoriza la salida de camiones que han sido cargados en patio.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Rápida
          </CardTitle>
          <CardDescription>
            Busca por placa, ID de despacho o nombre del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Escribe aquí para buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-base"
            />
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Viajes Listos para Salir
            <Badge variant="secondary">{filteredDeliveries.length}</Badge>
          </CardTitle>
          <CardDescription>
            Camiones cargados esperando autorización de salida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadedDeliveries.length === 0 ? (
             <div className="text-center py-8">
               <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">No hay viajes listos para salir en este momento.</p>
             </div>
          ) : filteredDeliveries.length === 0 ? (
             <div className="text-center py-8">
               <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">No se encontraron viajes con la búsqueda actual.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDeliveries.map((delivery) => (
                <LoadedDeliveryCard
                  key={delivery.delivery_id}
                  delivery={delivery}
                  onSelect={handleSelectDelivery}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {exitedDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Salidas Recientes
              <Badge variant="secondary">{exitedDeliveries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {exitedDeliveries.map((delivery) => (
                <ExitedDeliveryCard key={delivery.delivery_id} delivery={delivery} /> // CORREGIDO: usa delivery_id
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL DE AUTORIZACIÓN (Actualizado con las propiedades correctas) */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-green-600" />
              Autorizar Salida - {selectedDelivery?.truck?.placa}
            </DialogTitle>
            <DialogDescription>
              Verifica los detalles, toma una foto clara de la placa y genera la guía de despacho.
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Box className="h-4 w-4" /> Items de este Despacho:
                </p>
                <div className="border rounded-lg space-y-2 p-3 bg-muted/30">
                  {/* CORREGIDO: usa dispatchItems y orderDetails */}
                  {selectedDelivery.dispatchItems?.map((item: DeliveryItem) => {
                    const orderItem = selectedDelivery.orderDetails.items.find(
                      (oi) => oi.id === item.pedido_item_id
                    );
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {orderItem?.product?.name || 'Producto no encontrado'}
                        </span>
                        <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                          {item.dispatched_quantity} {orderItem?.product?.unit}
                        </span>
                      </div>
                    );
                  })}
                  {(!selectedDelivery.dispatchItems || selectedDelivery.dispatchItems.length === 0) && (
                     <p className="text-sm text-center text-muted-foreground py-2">No se registraron items para este despacho.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4" />
                    Foto del Patio
                  </h4>
                  {/* CORREGIDO: usa loadPhoto */}
                  {selectedDelivery.loadPhoto ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden group border">
                      <Image
                        src={selectedDelivery.loadPhoto}
                        alt="Foto de carga del patio"
                        fill
                        style={{ objectFit: "cover" }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        onClick={() =>
                           // CORREGIDO: usa loadPhoto
                          openImagePreview(selectedDelivery.loadPhoto!)
                        }
                      >
                        <Eye className="h-8 w-8 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-48 flex flex-col items-center justify-center">
                       <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                       <p className="text-sm text-muted-foreground">Sin foto de patio</p>
                    </div>
                  )}
                </div>
                <div>
                  <PhotoInput
                    onSelect={setExitPhoto}
                    required={true}
                    label="Foto de salida (obligatoria)"
                    capture={true}
                  />
                   <p className="text-xs text-muted-foreground mt-2">
                     Asegúrate que la placa sea claramente visible.
                   </p>
                </div>
              </div>
               {selectedDelivery.notes && (
                 <div className="p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
                   <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                     Notas del Patio:
                   </p>
                   <p className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                     {selectedDelivery.notes}
                   </p>
                 </div>
               )}
              <div className="space-y-2">
                <Label htmlFor="security-notes">Observaciones de Seguridad (Opcional)</Label>
                <Textarea
                  id="security-notes"
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  placeholder="Ej: Documentos en regla, vehículo en buenas condiciones..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAuthorizeExit}
                  disabled={isSubmitting || !exitPhoto}
                  className="flex-1"
                  size="lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Procesando..." : "Autorizar y Generar Guía"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseModals}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
         <DialogContent className="max-w-3xl p-0">
           {previewImageUrl && (
             <Image
               src={previewImageUrl}
               alt="Vista previa de la imagen"
               width={1200}
               height={900}
               className="w-full h-auto max-h-[90vh] object-contain"
             />
           )}
         </DialogContent>
      </Dialog>
    </div>
  );
}