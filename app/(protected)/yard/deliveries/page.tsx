"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { mockDeliveries } from "@/lib/mock-data"
import { toast } from "sonner"
import type { Delivery, LoadDeliveryForm } from "@/lib/types"
import { Truck, Package, User, Calendar, CheckCircle, Scale, AlertTriangle } from "lucide-react"

export default function YardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [loadForm, setLoadForm] = useState<LoadDeliveryForm>({
    deliveryId: "",
    loadedQuantity: 0,
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const pendingDeliveries = deliveries.filter((d) => d.status === "PENDING")
  const loadedDeliveries = deliveries.filter((d) => d.status === "LOADED")

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setLoadForm({
      deliveryId: delivery.id,
      loadedQuantity: delivery.order?.quantity || 0,
      notes: "",
    })
    setSuccess("")
    setError("")
  }

  const handleConfirmLoad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDelivery) return

    setIsSubmitting(true)
    setError("")

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update delivery status
      const updatedDeliveries = deliveries.map((d) =>
        d.id === selectedDelivery.id
          ? {
              ...d,
              status: "LOADED" as const,
              loadedQuantity: loadForm.loadedQuantity,
              loadedBy: "2", // Mock yard user ID
              loadedAt: new Date(),
              notes: loadForm.notes,
            }
          : d,
      )

      setDeliveries(updatedDeliveries)
      setSuccess(`Carga confirmada para ${selectedDelivery.order?.orderNumber}`)
      setSelectedDelivery(null)
      setLoadForm({
        deliveryId: "",
        loadedQuantity: 0,
        notes: "",
      })
    } catch (err) {
      setError("Error al confirmar la carga"); toast.error("No se pudo confirmar la carga")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
      case "LOADED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      case "EXITED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendiente"
      case "LOADED":
        return "Cargado"
      case "EXITED":
        return "Salió"
      default:
        return status
    }
  }

  return (
    <AppLayout title="Confirmar Cargas">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Patio</h2>
          <p className="text-muted-foreground">Confirma la cantidad cargada en cada camión</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Deliveries */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span>Entregas Pendientes</span>
                  <Badge variant="secondary">{pendingDeliveries.length}</Badge>
                </CardTitle>
                <CardDescription>Camiones esperando carga</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingDeliveries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hay entregas pendientes</p>
                ) : (
                  pendingDeliveries.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedDelivery?.id === delivery.id ? "ring-2 ring-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleSelectDelivery(delivery)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{delivery.order?.orderNumber}</p>
                            <p className="text-sm text-muted-foreground flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(delivery.createdAt).toLocaleDateString("es-MX")}</span>
                            </p>
                          </div>
                          <Badge className={getStatusColor(delivery.status)}>{getStatusText(delivery.status)}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{delivery.order?.customer?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{delivery.order?.product?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span>{delivery.order?.truck?.plates}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Scale className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {delivery.order?.quantity} {delivery.order?.product?.unit}
                            </span>
                          </div>
                        </div>

                        {delivery.order?.truck?.driverName && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Conductor: {delivery.order.truck.driverName}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Load Confirmation Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span>Confirmar Carga</span>
                </CardTitle>
                <CardDescription>
                  {selectedDelivery ? "Registra la cantidad cargada" : "Selecciona una entrega para confirmar"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDelivery ? (
                  <form onSubmit={handleConfirmLoad} className="space-y-4">
                    {/* Order Details */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <h4 className="font-medium">Detalles del Pedido</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Pedido:</span>
                          <p className="font-medium">{selectedDelivery.order?.orderNumber}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>
                          <p className="font-medium">{selectedDelivery.order?.customer?.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Producto:</span>
                          <p className="font-medium">{selectedDelivery.order?.product?.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Camión:</span>
                          <p className="font-medium">{selectedDelivery.order?.truck?.plates}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-2">
                      <Label htmlFor="loadedQuantity">Cantidad Cargada *</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="loadedQuantity"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={selectedDelivery.order?.quantity}
                          value={loadForm.loadedQuantity || ""}
                          onChange={(e) =>
                            setLoadForm({ ...loadForm, loadedQuantity: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0.0"
                          required
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {selectedDelivery.order?.product?.unit}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cantidad solicitada: {selectedDelivery.order?.quantity} {selectedDelivery.order?.product?.unit}
                      </p>
                      {loadForm.loadedQuantity > 0 && loadForm.loadedQuantity !== selectedDelivery.order?.quantity && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>
                            Diferencia:{" "}
                            {((loadForm.loadedQuantity - (selectedDelivery.order?.quantity || 0)) * 100) /
                              (selectedDelivery.order?.quantity || 1) >
                            0
                              ? "+"
                              : ""}
                            {(
                              ((loadForm.loadedQuantity - (selectedDelivery.order?.quantity || 0)) * 100) /
                              (selectedDelivery.order?.quantity || 1)
                            ).toFixed(1)}
                            %
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observaciones</Label>
                      <Textarea
                        id="notes"
                        value={loadForm.notes}
                        onChange={(e) => setLoadForm({ ...loadForm, notes: e.target.value })}
                        placeholder="Comentarios sobre la carga, diferencias, etc..."
                        rows={3}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-3">
                      <Button type="submit" disabled={isSubmitting || loadForm.loadedQuantity <= 0} className="flex-1">
                        {isSubmitting ? "Confirmando..." : "Confirmar Carga"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedDelivery(null)
                          setLoadForm({
                            deliveryId: "",
                            loadedQuantity: 0,
                            notes: "",
                          })
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecciona una entrega pendiente para confirmar la carga</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loaded Deliveries */}
        {loadedDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Entregas Cargadas</span>
                <Badge variant="secondary">{loadedDeliveries.length}</Badge>
              </CardTitle>
              <CardDescription>Camiones listos para salir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadedDeliveries.map((delivery) => (
                  <Card
                    key={delivery.id}
                    className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{delivery.order?.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{delivery.order?.truck?.plates}</p>
                        </div>
                        <Badge className={getStatusColor(delivery.status)}>{getStatusText(delivery.status)}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Solicitado:</span>
                          <span>
                            {delivery.order?.quantity} {delivery.order?.product?.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cargado:</span>
                          <span className="font-medium">
                            {delivery.loadedQuantity} {delivery.order?.product?.unit}
                          </span>
                        </div>
                        {delivery.loadedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hora:</span>
                            <span>{new Date(delivery.loadedAt).toLocaleTimeString("es-MX")}</span>
                          </div>
                        )}
                      </div>

                      {delivery.notes && (
                        <div className="mt-3 p-2 bg-background rounded text-xs">
                          <span className="font-medium">Notas:</span> {delivery.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
