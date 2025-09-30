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
  LogOut,
  Camera,
  FileText,
  Eye,
  Box,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { Delivery, DeliveryItem, Invoice } from "@/lib/types";

// --- SUB-COMPONENTES ---

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
            <p className="text-sm text-muted-foreground">
              Despacho ID: {delivery.id}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Listo para Salir
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {delivery.orderDetails?.client?.name}
            </span>
          </div>
          {delivery.orderDetails.invoices &&
            delivery.orderDetails.invoices.length > 0 && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {delivery.orderDetails.invoices.map((invoice: Invoice) => (
                    <Badge
                      key={invoice.invoice_full_number}
                      variant="secondary"
                      className="text-xs"
                    >
                      {invoice.invoice_full_number}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>
              {delivery.dispatchItems && delivery.dispatchItems.length > 0
                ? `${
                    delivery.orderDetails.items.find(
                      (i) => i.id === delivery.dispatchItems![0].pedido_item_id
                    )?.product.name
                  } ${
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

const ExitedDeliveryCard = React.memo(
  ({
    delivery,
    onSelect,
  }: {
    delivery: Delivery;
    onSelect: (delivery: Delivery) => void;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
      onClick={() => onSelect(delivery)}
    >
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-semibold">{delivery.truck?.placa}</p>
            <p className="text-sm text-muted-foreground">
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
              <span>
                {new Date(delivery.exitedAt).toLocaleString("es-VE", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                  timeZone: "America/Caracas",
                })}
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3">
          <Eye className="h-4 w-4 mr-2" /> Ver Detalles
        </Button>
      </CardContent>
    </Card>
  )
);
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
  const [exitLoadPhoto, setExitLoadPhoto] = useState<File | null>(null);
  const [exitNotes, setExitNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // ✅ NUEVO: Estados para el modal de detalles del despacho que ya salió.
  const [showExitedDetailModal, setShowExitedDetailModal] = useState(false);
  const [selectedExitedDelivery, setSelectedExitedDelivery] =
    useState<Delivery | null>(null);

  const loadedDeliveries = useMemo(
    () => allDeliveries.filter((d) => d.status === "CARGADA"),
    [allDeliveries]
  );
  const exitedDeliveries = useMemo(
    () => allDeliveries.filter((d) => d.status === "EXITED"),
    [allDeliveries]
  );

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return loadedDeliveries;
    return loadedDeliveries.filter((delivery) => {
      const deliveryId = String(delivery.id);
      return (
        (delivery.truck?.placa || "").toLowerCase().includes(query) ||
        deliveryId.toLowerCase().includes(query) ||
        (delivery.orderDetails?.client?.name || "")
          .toLowerCase()
          .includes(query) ||
        delivery.orderDetails?.invoices?.some((invoice) =>
          invoice.invoice_full_number?.toLowerCase().includes(query)
        )
      );
    });
  }, [searchQuery, loadedDeliveries]);

  const handleSelectDelivery = useCallback((delivery: Delivery) => {
    if (delivery.status !== "CARGADA") {
      toast.warning("Este despacho no está listo para salir.");
      return;
    }
    setImageError(false);
    setSelectedDelivery(delivery);
    setExitPhoto(null);
    setExitLoadPhoto(null);
    setExitNotes("");
    setShowExitModal(true);
  }, []);

  // ✅ NUEVO: Handler para seleccionar y mostrar el modal de un despacho que ya salió.
  const handleSelectExitedDelivery = useCallback((delivery: Delivery) => {
    setSelectedExitedDelivery(delivery);
    setShowExitedDetailModal(true);
  }, []);

  const handleImageError = useCallback(() => {
    toast.warning("La foto del patio no se pudo cargar.", {
      description: "Puede que no se haya subido correctamente o fue eliminada.",
    });
    setImageError(true);
  }, []);

  const handleCloseModals = useCallback(() => {
    setShowExitModal(false);
    setShowImagePreview(false);
    setShowExitedDetailModal(false);
    setSelectedDelivery(null);
    setSelectedExitedDelivery(null);
    setPreviewImageUrl(null);
  }, []);

  const handleAuthorizeExit = useCallback(async () => {
    if (!selectedDelivery) return;

    if (!exitPhoto || !exitLoadPhoto) {
      toast.error("Ambas fotos (camión y carga) son obligatorias.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("status", "EXITED");
      formData.append("exit_notes", exitNotes);
      if (user?.id) formData.append("userId", user.id.toString());

      formData.append("exitPhoto", exitPhoto);
      formData.append("exitLoadPhoto", exitLoadPhoto);

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
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

      setAllDeliveries((prev) =>
        prev.map((d) => (d.id === updatedDelivery.id ? updatedDelivery : d))
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
  }, [
    selectedDelivery,
    exitPhoto,
    exitLoadPhoto,
    exitNotes,
    user?.id,
    handleCloseModals,
  ]);

  const openImagePreview = useCallback((imageUrl: string) => {
    const correctedUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    setPreviewImageUrl(correctedUrl);
    setShowImagePreview(true);
  }, []);

  return (
    <div className="space-y-6">
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
            Busca por placa, ID, cliente o factura.
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
              <p className="text-muted-foreground">
                No hay viajes listos para salir en este momento.
              </p>
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No se encontraron viajes con la búsqueda actual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDeliveries.map((delivery) => (
                <LoadedDeliveryCard
                  key={delivery.id}
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
                <ExitedDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onSelect={handleSelectExitedDelivery}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL DE AUTORIZACIÓN */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-green-600" />
              Autorizar Salida - {selectedDelivery?.truck?.placa}
            </DialogTitle>
            <DialogDescription>
              Verifica los detalles, toma las fotos requeridas y genera la guía
              de despacho.
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              {selectedDelivery.orderDetails.invoices &&
                selectedDelivery.orderDetails.invoices.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Facturas Asociadas:
                    </p>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex flex-wrap gap-2">
                        {selectedDelivery.orderDetails.invoices.map(
                          (invoice: Invoice) => (
                            <Badge
                              key={invoice.invoice_full_number}
                              variant="default"
                            >
                              {invoice.invoice_full_number}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Box className="h-4 w-4" /> Items de este Despacho:
                </p>
                <div className="border rounded-lg space-y-2 p-3 bg-muted/30">
                  {selectedDelivery.dispatchItems?.map((item: DeliveryItem) => {
                    const orderItem = selectedDelivery.orderDetails.items.find(
                      (oi) => oi.id === item.pedido_item_id
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-muted-foreground">
                          {orderItem?.product?.name || "Producto no encontrado"}
                        </span>
                        <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                          {item.dispatched_quantity} {orderItem?.product?.unit}
                        </span>
                      </div>
                    );
                  })}
                  {(!selectedDelivery.dispatchItems ||
                    selectedDelivery.dispatchItems.length === 0) && (
                    <p className="text-sm text-center text-muted-foreground py-2">
                      No se registraron items para este despacho.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4" />
                    Foto del Patio
                  </h4>
                  {selectedDelivery.loadPhoto && !imageError ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden group border">
                      <Image
                        // ✅ CORRECCIÓN: No añadir slash extra
                        src={selectedDelivery.loadPhoto}
                        alt="Foto de carga del patio"
                        fill
                        style={{ objectFit: "cover" }}
                        onError={handleImageError}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        onClick={() =>
                          openImagePreview(selectedDelivery.loadPhoto!)
                        }
                      >
                        <Eye className="h-8 w-8 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-destructive/25 bg-destructive/5 rounded-lg h-48 flex flex-col items-center justify-center text-destructive">
                      <AlertTriangle className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">
                        {imageError
                          ? "Error al cargar foto"
                          : "Sin foto de patio"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <PhotoInput
                    onSelect={setExitPhoto}
                    required={true}
                    label="Foto del Camión (Placa)"
                    capture={true}
                  />
                  <PhotoInput
                    onSelect={setExitLoadPhoto}
                    required={true}
                    label="Foto de la Carga"
                    capture={true}
                  />
                  <p className="text-xs text-muted-foreground -mt-2">
                    Ambas fotos son obligatorias para la salida.
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
                <Label htmlFor="security-notes">
                  Observaciones de Seguridad (Opcional)
                </Label>
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
                  disabled={isSubmitting || !exitPhoto || !exitLoadPhoto}
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

      {/* ✅ NUEVO: MODAL DE DETALLES DEL DESPACHO QUE YA SALIÓ */}
      <Dialog
        open={showExitedDetailModal}
        onOpenChange={setShowExitedDetailModal}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Detalles del Despacho - {selectedExitedDelivery?.truck?.placa}
            </DialogTitle>
            <DialogDescription>
              Información completa del despacho que ya salió de las
              instalaciones.
            </DialogDescription>
          </DialogHeader>
          {selectedExitedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Cliente</h4>
                  <p className="text-muted-foreground">
                    {selectedExitedDelivery.orderDetails.client.name}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Fecha de Salida</h4>
                  <p className="text-muted-foreground">
                    {selectedExitedDelivery.exitedAt
                      ? new Date(
                          selectedExitedDelivery.exitedAt
                        ).toLocaleString("es-VE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/Caracas",
                        })
                      : "No disponible"}
                  </p>
                </div>
              </div>

              {selectedExitedDelivery.orderDetails.invoices &&
                selectedExitedDelivery.orderDetails.invoices.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Facturas Asociadas:
                    </p>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex flex-wrap gap-2">
                        {selectedExitedDelivery.orderDetails.invoices.map(
                          (invoice: Invoice) => (
                            <Badge
                              key={invoice.invoice_full_number}
                              variant="default"
                            >
                              {invoice.invoice_full_number}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Box className="h-4 w-4" /> Items Despachados:
                </p>
                <div className="border rounded-lg space-y-2 p-3 bg-muted/30">
                  {selectedExitedDelivery.dispatchItems?.map(
                    (item: DeliveryItem) => {
                      const orderItem =
                        selectedExitedDelivery.orderDetails.items.find(
                          (oi) => oi.id === item.pedido_item_id
                        );
                      return (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-muted-foreground">
                            {orderItem?.product?.name ||
                              "Producto no encontrado"}
                          </span>
                          <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {item.dispatched_quantity}{" "}
                            {orderItem?.product?.unit}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-lg pt-2 border-t mt-4">
                Fotos del Despacho
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Foto de Patio */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4" /> Patio
                  </h4>
                  {selectedExitedDelivery.loadPhoto ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden group border">
                      <Image
                        // ✅ CORRECCIÓN: No añadir slash extra
                        src={selectedExitedDelivery.loadPhoto}
                        alt="Foto de carga del patio"
                        fill
                        style={{ objectFit: "cover" }}
                        onError={() =>
                          toast.error("No se pudo cargar la foto del patio")
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          openImagePreview(selectedExitedDelivery.loadPhoto!)
                        }
                      >
                        <Eye className="h-6 w-6 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center text-muted-foreground text-sm">
                      Sin Foto
                    </div>
                  )}
                </div>
                {/* Foto del Camión */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" /> Camión (Placa)
                  </h4>
                  {selectedExitedDelivery.exitPhoto ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden group border">
                      <Image
                        // ✅ CORRECCIÓN: No añadir slash extra
                        src={selectedExitedDelivery.exitPhoto}
                        alt="Foto de salida del camión"
                        fill
                        style={{ objectFit: "cover" }}
                        onError={() =>
                          toast.error("No se pudo cargar la foto del camión")
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          openImagePreview(selectedExitedDelivery.exitPhoto!)
                        }
                      >
                        <Eye className="h-6 w-6 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center text-muted-foreground text-sm">
                      Sin Foto
                    </div>
                  )}
                </div>
                {/* Foto de la Carga */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" /> Carga
                  </h4>
                  {selectedExitedDelivery.exitLoadPhoto ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden group border">
                      <Image
                        // ✅ CORRECCIÓN: No añadir slash extra
                        src={selectedExitedDelivery.exitLoadPhoto}
                        alt="Foto de salida de la carga"
                        fill
                        style={{ objectFit: "cover" }}
                        onError={() =>
                          toast.error("No se pudo cargar la foto de la carga")
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          openImagePreview(
                            selectedExitedDelivery.exitLoadPhoto!
                          )
                        }
                      >
                        <Eye className="h-6 w-6 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center text-muted-foreground text-sm">
                      Sin Foto
                    </div>
                  )}
                </div>
              </div>

              {selectedExitedDelivery.notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Notas del Patio:
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                    {selectedExitedDelivery.notes}
                  </p>
                </div>
              )}
              {selectedExitedDelivery.exit_notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Observaciones de Seguridad:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
                    {selectedExitedDelivery.exit_notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={handleCloseModals}>
                  Cerrar
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
