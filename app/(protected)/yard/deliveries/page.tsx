"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DeliveryCard } from "@/components/cards/delivery-card"
import { QuantityInput } from "@/components/forms/quantity-input"
import { PhotoInput } from "@/components/forms/photo-input"
import { toast } from "sonner"
import type { Delivery } from "@/lib/types"
import { CheckCircle, AlertTriangle, Camera, Package, Eye, X } from "lucide-react"

export default function YardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loadedQuantity, setLoadedQuantity] = useState<number>(0)
  const [loadPhoto, setLoadPhoto] = useState<File | null>(null)
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/deliveries", { cache: "no-store" })
        if (!res.ok) throw new Error(await res.text())
        const data: Delivery[] = await res.json()
        setDeliveries(data)
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar despachos")
      } finally {
        setLoading(false)
      }
    }
    loadDeliveries()
  }, [])

  const pendingDeliveries = deliveries.filter((d) => d.estado === "ASIGNADA")
  const loadedDeliveries = deliveries.filter((d) => d.estado === "CARGADA")

  const handleConfirmLoad = (deliveryId: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId)
    if (delivery) {
      setSelectedDelivery(delivery)
      setLoadedQuantity(delivery.cantidadBase)
      setLoadPhoto(null)
      setNotes("")
      setShowConfirmModal(true)
    }
  }

  const handleSubmitLoad = async () => {
    if (!selectedDelivery || !loadPhoto || loadedQuantity <= 0) {
      toast.error("Completa los campos requeridos: cantidad y foto.")
      return
    }

    setIsSubmitting(true)
    
    // Optimistic update
    const originalDeliveries = deliveries;
    const updatedDeliveries = deliveries.map((d) =>
      d.id === selectedDelivery.id
        ? {
            ...d,
            estado: "CARGADA" as const,
            loadedQuantity: loadedQuantity,
            loadedAt: new Date(),
            notes: notes || undefined,
          }
        : d,
    )
    setDeliveries(updatedDeliveries)
    setShowConfirmModal(false)

    try {
      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            estado: 'CARGADA',
            loadedQuantity,
            notes,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Carga confirmada exitosamente", {
        description: `Viaje para ${selectedDelivery.truck?.placa} actualizado.`,
      })
    } catch (error) {
      // Revert on error
      setDeliveries(originalDeliveries)
      toast.error("Error al confirmar la carga", {
        description: "Por favor, inténtalo de nuevo.",
      })
    } finally {
      setIsSubmitting(false)
      // Reset form
      setSelectedDelivery(null)
      setLoadPhoto(null)
      setNotes("")
    }
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
    setSelectedDelivery(null)
    setPreviewImageUrl(null);
  }

  const openImagePreview = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl)
    setShowImagePreview(true)
  }

  const tolerance = selectedDelivery ? selectedDelivery.cantidadBase * 0.05 : 0
  const minQuantity = selectedDelivery ? selectedDelivery.cantidadBase - tolerance : 0
  const maxQuantity = selectedDelivery ? selectedDelivery.cantidadBase + tolerance : 0
  const isWithinTolerance = loadedQuantity >= minQuantity && loadedQuantity <= maxQuantity
  const differencePercent = selectedDelivery
    ? ((loadedQuantity - selectedDelivery.cantidadBase) / selectedDelivery.cantidadBase) * 100
    : 0
    
  if (loading) {
    return (
      <AppLayout title="Confirmación de Carga">
        <div className="p-6 text-center">Cargando despachos...</div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Confirmación de Carga">
        <div className="p-6 text-destructive text-center">Error: {error}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Confirmación de Carga">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Patio</h2>
          <p className="text-muted-foreground">Confirma la carga de los viajes pendientes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Viajes Pendientes
              <Badge variant="secondary">{pendingDeliveries.length}</Badge>
            </CardTitle>
            <CardDescription>Camiones esperando confirmación de carga</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay viajes pendientes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingDeliveries.map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onConfirmLoad={handleConfirmLoad}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {loadedDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Viajes Cargados
                <Badge variant="secondary">{loadedDeliveries.length}</Badge>
              </CardTitle>
              <CardDescription>Camiones listos para salir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadedDeliveries.map((delivery) => (
                  <DeliveryCard key={delivery.id} delivery={delivery} showActions={false} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-50">
            <DialogHeader className="pb-3">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Confirmar Carga - {selectedDelivery?.truck?.placa}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Registra la cantidad real cargada y toma una foto del proceso
              </DialogDescription>
            </DialogHeader>

            {selectedDelivery && selectedDelivery.productFormat && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Información del Viaje</h4>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cliente</span>
                      <p className="font-medium text-sm">{selectedDelivery.order?.client?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Material</span>
                      <p className="font-medium text-sm">{selectedDelivery.productFormat?.product?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Formato</span>
                      <p className="font-medium text-sm">{selectedDelivery.productFormat?.sku}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Solicitado</span>
                      <p className="font-medium text-sm">
                        {selectedDelivery.cantidadBase} {selectedDelivery.productFormat?.unidadBase}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="border p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4" />
                      Foto de Camión (Cajero)
                    </h4>
                    {selectedDelivery.loadPhoto ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden group">
                        <img
                          src={selectedDelivery.loadPhoto || "/placeholder.svg"}
                          alt="Foto de carga del cajero"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          onClick={() => openImagePreview(selectedDelivery.loadPhoto!)}
                        >
                          <Eye className="h-8 w-8 text-white" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center h-48 flex flex-col items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Sin foto de cajero</p>
                      </div>
                    )}
                  </div>

                  <div className="border p-4 rounded-lg">
                    <PhotoInput onSelect={setLoadPhoto} required={true} label="Foto de la carga (obligatoria)" />
                  </div>
                </div>

                <div className="space-y-3">
                  <QuantityInput
                    unitBase={selectedDelivery.productFormat.unidadBase}
                    value={loadedQuantity}
                    onChange={setLoadedQuantity}
                    label="Cantidad real cargada"
                  />
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Tolerancia ±5%: {minQuantity.toFixed(1)} - {maxQuantity.toFixed(1)}{" "}
                        {selectedDelivery.productFormat?.unidadBase}
                      </span>
                    </div>
                    {loadedQuantity > 0 && (
                      <p className={`text-xs font-medium ${isWithinTolerance ? "text-green-600" : "text-amber-600"}`}>
                        Diferencia: {differencePercent > 0 ? "+" : ""}
                        {differencePercent.toFixed(1)}% {isWithinTolerance ? "(✓ Dentro)" : "(⚠ Fuera)"} de tolerancia
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Observaciones</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Comentarios sobre la carga..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSubmitLoad}
                    disabled={isSubmitting || !loadPhoto || loadedQuantity <= 0}
                    className="flex-1 h-9"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Confirmando..." : "Confirmar Carga"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="h-9 bg-transparent"
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
                <DialogHeader>
                    <DialogTitle className="sr-only">Vista Previa de la Imagen</DialogTitle>
                </DialogHeader>
                {previewImageUrl && (
                <img src={previewImageUrl} alt="Vista previa" className="w-full h-auto max-h-[90vh] object-contain" />
                )}
            </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  )
}