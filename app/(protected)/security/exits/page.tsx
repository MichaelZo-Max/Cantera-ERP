"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { mockDeliveries } from "@/lib/mock-data"
import type { Delivery, ExitDeliveryForm } from "@/lib/types"
import { Shield, Truck, Package, User, CheckCircle, Clock, AlertTriangle, LogOut } from "lucide-react"

export default function SecurityExitsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [exitForm, setExitForm] = useState<ExitDeliveryForm>({
    deliveryId: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const loadedDeliveries = deliveries.filter((d) => d.status === "LOADED")
  const exitedDeliveries = deliveries.filter((d) => d.status === "EXITED")

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setExitForm({
      deliveryId: delivery.id,
      notes: "",
    })
    setSuccess("")
    setError("")
  }

  const handleAuthorizeExit = async (e: React.FormEvent) => {
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
              status: "EXITED" as const,
              exitedBy: "3", // Mock security user ID
              exitedAt: new Date(),
              notes: exitForm.notes || d.notes,
            }
          : d,
      )

      setDeliveries(updatedDeliveries)
      setSuccess(
        `Salida autorizada para ${selectedDelivery.order?.orderNumber} - ${selectedDelivery.order?.truck?.plates}`,
      )
      setSelectedDelivery(null)
      setExitForm({
        deliveryId: "",
        notes: "",
      })
    } catch (err) {
      setError("Error al autorizar la salida")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
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
      case "LOADED":
        return "Listo para Salir"
      case "EXITED":
        return "Salió"
      default:
        return status
    }
  }

  const calculateWaitTime = (loadedAt: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - loadedAt.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 60) {
      return `${diffMins} min`
    } else {
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return `${hours}h ${mins}m`
    }
  }

  return (
    <AppLayout title="Control de Salida">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Salida</h2>
          <p className="text-muted-foreground">Autoriza la salida de camiones cargados</p>
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
          {/* Ready to Exit */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span>Listos para Salir</span>
                  <Badge variant="secondary">{loadedDeliveries.length}</Badge>
                </CardTitle>
                <CardDescription>Camiones cargados esperando autorización</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay camiones esperando salida</p>
                  </div>
                ) : (
                  loadedDeliveries.map((delivery) => (
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
                            <p className="font-semibold text-lg">{delivery.order?.truck?.plates}</p>
                            <p className="text-sm text-muted-foreground">{delivery.order?.orderNumber}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(delivery.status)}>{getStatusText(delivery.status)}</Badge>
                            {delivery.loadedAt && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Esperando: {calculateWaitTime(delivery.loadedAt)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{delivery.order?.customer?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{delivery.order?.product?.name}</span>
                          </div>
                        </div>

                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Cantidad cargada:</span>
                            <span className="font-medium">
                              {delivery.loadedQuantity} {delivery.order?.product?.unit}
                            </span>
                          </div>
                          {delivery.loadedQuantity !== delivery.order?.quantity && (
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-muted-foreground">Solicitado:</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                {delivery.order?.quantity} {delivery.order?.product?.unit}
                              </span>
                            </div>
                          )}
                        </div>

                        {delivery.order?.truck?.driverName && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Conductor: {delivery.order.truck.driverName}
                            {delivery.order.truck.driverPhone && ` - ${delivery.order.truck.driverPhone}`}
                          </p>
                        )}

                        {delivery.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded text-xs">
                            <span className="font-medium text-yellow-800 dark:text-yellow-300">Notas del patio:</span>
                            <p className="text-yellow-700 dark:text-yellow-400">{delivery.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Exit Authorization Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LogOut className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Autorizar Salida</span>
                </CardTitle>
                <CardDescription>
                  {selectedDelivery ? "Confirma la salida del camión" : "Selecciona un camión para autorizar salida"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDelivery ? (
                  <form onSubmit={handleAuthorizeExit} className="space-y-4">
                    {/* Delivery Summary */}
                    <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Resumen de Salida</h4>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">Camión:</span>
                          <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                            {selectedDelivery.order?.truck?.plates}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">Pedido:</span>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {selectedDelivery.order?.orderNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">Cliente:</span>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {selectedDelivery.order?.customer?.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">Producto:</span>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {selectedDelivery.order?.product?.name}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700 dark:text-blue-300">Cantidad autorizada:</span>
                          <span className="font-bold text-blue-900 dark:text-blue-100">
                            {selectedDelivery.loadedQuantity} {selectedDelivery.order?.product?.unit}
                          </span>
                        </div>
                        {selectedDelivery.loadedAt && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-blue-700 dark:text-blue-300">Cargado:</span>
                            <span className="text-blue-800 dark:text-blue-200">
                              {new Date(selectedDelivery.loadedAt).toLocaleString("es-MX")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Driver Information */}
                    {selectedDelivery.order?.truck?.driverName && (
                      <div className="bg-muted p-3 rounded-lg">
                        <h5 className="font-medium text-foreground mb-2">Información del Conductor</h5>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Nombre:</span>{" "}
                            {selectedDelivery.order.truck.driverName}
                          </p>
                          {selectedDelivery.order.truck.driverPhone && (
                            <p>
                              <span className="text-muted-foreground">Teléfono:</span>{" "}
                              {selectedDelivery.order.truck.driverPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Security Notes */}
                    <div className="space-y-2">
                      <label htmlFor="securityNotes" className="text-sm font-medium text-foreground">
                        Observaciones de Seguridad
                      </label>
                      <Textarea
                        id="securityNotes"
                        value={exitForm.notes}
                        onChange={(e) => setExitForm({ ...exitForm, notes: e.target.value })}
                        placeholder="Documentos verificados, condición del vehículo, observaciones..."
                        rows={3}
                      />
                    </div>

                    {/* Previous Notes */}
                    {selectedDelivery.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 p-3 rounded-lg">
                        <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Notas del Patio</h5>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">{selectedDelivery.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
                        {isSubmitting ? "Autorizando..." : "Autorizar Salida"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedDelivery(null)
                          setExitForm({
                            deliveryId: "",
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
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecciona un camión para autorizar su salida</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Exits */}
        {exitedDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Salidas Recientes</span>
                <Badge variant="secondary">{exitedDeliveries.length}</Badge>
              </CardTitle>
              <CardDescription>Camiones que han salido hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exitedDeliveries.map((delivery) => (
                  <Card
                    key={delivery.id}
                    className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{delivery.order?.truck?.plates}</p>
                          <p className="text-sm text-muted-foreground">{delivery.order?.orderNumber}</p>
                        </div>
                        <Badge className={getStatusColor(delivery.status)}>{getStatusText(delivery.status)}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cliente:</span>
                          <span className="truncate ml-2">{delivery.order?.customer?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span>
                            {delivery.loadedQuantity} {delivery.order?.product?.unit}
                          </span>
                        </div>
                        {delivery.exitedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Salida:</span>
                            <span>{new Date(delivery.exitedAt).toLocaleTimeString("es-MX")}</span>
                          </div>
                        )}
                      </div>
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
