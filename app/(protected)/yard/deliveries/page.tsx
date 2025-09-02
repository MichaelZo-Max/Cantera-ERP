"use client"

import { useState } from "react"
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
import { CheckCircle, AlertTriangle, Camera, Package } from "lucide-react"

// Mock data - En producción vendría de la API
const mockDeliveries: (Delivery & {
  order?: {
    client?: { nombre: string }
    destination?: { nombre: string }
  }
  truck?: { placa: string }
  productFormat?: {
    product?: { nombre: string }
    sku?: string
    unidadBase: string
  }
})[] = [
  {
    id: "d1",
    orderId: "o1",
    truckId: "t1",
    cantidadBase: 10,
    estado: "ASIGNADA",
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      client: { nombre: "Constructora Los Andes" },
      destination: { nombre: "Obra Av. Norte" },
    },
    truck: { placa: "ABC-12D" },
    productFormat: {
      product: { nombre: "Grava 3/4" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
  },
  {
    id: "d2",
    orderId: "o2",
    truckId: "t2",
    cantidadBase: 15,
    estado: "ASIGNADA",
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      client: { nombre: "Obras Civiles CA" },
      destination: { nombre: "Puente Autopista" },
    },
    truck: { placa: "XYZ-34E" },
    productFormat: {
      product: { nombre: "Arena Lavada" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
  },
  {
    id: "d3",
    orderId: "o3",
    truckId: "t3",
    cantidadBase: 8,
    estado: "CARGADA",
    loadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      client: { nombre: "Constructora Los Andes" },
      destination: { nombre: "Proyecto Residencial" },
    },
    truck: { placa: "DEF-56F" },
    productFormat: {
      product: { nombre: "Grava 3/4" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
  },
]

export default function YardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState(mockDeliveries)
  const [selectedDelivery, setSelectedDelivery] = useState<(typeof mockDeliveries)[0] | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loadedQuantity, setLoadedQuantity] = useState<number>(0)
  const [loadPhoto, setLoadPhoto] = useState<File | null>(null)
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pendingDeliveries = deliveries.filter((d) => d.estado === "ASIGNADA")
  const loadedDeliveries = deliveries.filter((d) => d.estado === "CARGADA")

  const handleConfirmLoad = (deliveryId: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId)
    if (delivery) {
      setSelectedDelivery(delivery)
      setLoadedQuantity(delivery.cantidadBase) // Pre-llenar con cantidad solicitada
      setLoadPhoto(null)
      setNotes("")
      setShowConfirmModal(true)
    }
  }

  const handleSubmitLoad = async () => {
    if (!selectedDelivery || !loadPhoto || loadedQuantity <= 0) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setIsSubmitting(true)

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Actualizar estado del delivery
      const updatedDeliveries = deliveries.map((d) =>
        d.id === selectedDelivery.id
          ? {
              ...d,
              estado: "CARGADA" as const,
              cantidadBase: loadedQuantity,
              loadedBy: "yard-user-1",
              loadedAt: new Date(),
              notes: notes || undefined,
            }
          : d,
      )

      setDeliveries(updatedDeliveries)

      toast.success("Carga confirmada", {
        description: `Viaje ${selectedDelivery.truck?.placa} marcado como cargado`,
      })

      // Limpiar y cerrar modal
      setShowConfirmModal(false)
      setSelectedDelivery(null)
      setLoadedQuantity(0)
      setLoadPhoto(null)
      setNotes("")
    } catch (error) {
      toast.error("Error al confirmar carga")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
    setSelectedDelivery(null)
    setLoadedQuantity(0)
    setLoadPhoto(null)
    setNotes("")
  }

  // Calcular tolerancia (ejemplo: ±5%)
  const tolerance = selectedDelivery ? selectedDelivery.cantidadBase * 0.05 : 0
  const minQuantity = selectedDelivery ? selectedDelivery.cantidadBase - tolerance : 0
  const maxQuantity = selectedDelivery ? selectedDelivery.cantidadBase + tolerance : 0

  const isWithinTolerance = loadedQuantity >= minQuantity && loadedQuantity <= maxQuantity
  const differencePercent = selectedDelivery
    ? ((loadedQuantity - selectedDelivery.cantidadBase) / selectedDelivery.cantidadBase) * 100
    : 0

  return (
    <AppLayout title="Confirmación de Carga">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Patio</h2>
          <p className="text-muted-foreground">Confirma la carga de los viajes pendientes</p>
        </div>

        {/* Viajes Pendientes */}
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

        {/* Viajes Cargados */}
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

        {/* Modal Confirmar Carga */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Confirmar Carga
              </DialogTitle>
              <DialogDescription>Registra la cantidad real cargada y toma una foto del proceso</DialogDescription>
            </DialogHeader>

            {selectedDelivery && (
              <div className="space-y-6">
                {/* Información del viaje */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Información del Viaje</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Placa:</span>
                      <p className="font-medium">{selectedDelivery.truck?.placa}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{selectedDelivery.order?.client?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <p className="font-medium">{selectedDelivery.productFormat?.product?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Formato:</span>
                      <p className="font-medium">{selectedDelivery.productFormat?.sku}</p>
                    </div>
                  </div>
                </div>

                {/* Cantidad cargada */}
                <div className="space-y-4">
                  <QuantityInput
                    unitBase={selectedDelivery.productFormat?.unidadBase as any}
                    value={loadedQuantity}
                    onChange={setLoadedQuantity}
                    label="Cantidad real cargada"
                  />

                  {/* Tolerancia */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Tolerancia de referencia
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p>
                        Cantidad solicitada: {selectedDelivery.cantidadBase}{" "}
                        {selectedDelivery.productFormat?.unidadBase}
                      </p>
                      <p>
                        Rango aceptable: {minQuantity.toFixed(1)} - {maxQuantity.toFixed(1)}{" "}
                        {selectedDelivery.productFormat?.unidadBase} (±5%)
                      </p>
                      {loadedQuantity > 0 && (
                        <p className={`font-medium ${isWithinTolerance ? "text-green-600" : "text-amber-600"}`}>
                          Diferencia: {differencePercent > 0 ? "+" : ""}
                          {differencePercent.toFixed(1)}%{" "}
                          {isWithinTolerance ? "(Dentro de tolerancia)" : "(Fuera de tolerancia)"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Foto obligatoria */}
                <PhotoInput onSelect={setLoadPhoto} required={true} label="Foto de la carga (obligatoria)" />

                {/* Observaciones */}
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Comentarios sobre la carga, diferencias encontradas, etc..."
                    rows={3}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitLoad}
                    disabled={isSubmitting || !loadPhoto || loadedQuantity <= 0}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Confirmando..." : "Confirmar Carga"}
                  </Button>
                  <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
