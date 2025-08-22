"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Truck, MapPin, Package, Clock, CheckCircle } from "lucide-react"
import { mockDeliveries } from "@/lib/mock-data"

const statusConfig = {
  PENDING: {
    label: "Pendiente",
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
  },
  LOADED: {
    label: "Cargada",
    color:
      "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle,
  },
  EXITED: {
    label: "Salida OK",
    color:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle,
  },
}

export default function CashierDeliveriesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDeliveries = mockDeliveries.filter(
    (delivery) =>
      delivery.order?.truck?.plates.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.order?.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.order?.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Seguimiento de Despachos</h1>
          <p className="text-muted-foreground mt-1">Monitorea el estado de las órdenes creadas</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{filteredDeliveries.filter((d) => d.status === "EXITED").length} Completados</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>{filteredDeliveries.filter((d) => d.status !== "EXITED").length} En Proceso</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por placa, cliente o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Deliveries Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {filteredDeliveries.map((delivery) => {
          const StatusIcon = statusConfig[delivery.status as keyof typeof statusConfig]?.icon || Clock
          const statusStyle = statusConfig[delivery.status as keyof typeof statusConfig]?.color || ""
          const statusLabel = statusConfig[delivery.status as keyof typeof statusConfig]?.label || delivery.status

          return (
            <Card key={delivery.id} className="hover:shadow-lg transition-all duration-200 border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold">{delivery.order?.truck?.plates || "N/A"}</CardTitle>
                  </div>
                  <Badge className={`${statusStyle} font-medium`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusLabel}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium text-foreground">{delivery.order?.customer?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>Orden #{delivery.order?.orderNumber || delivery.orderId}</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{delivery.order?.product?.name || "N/A"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Unidad: {delivery.order?.product?.unit || "N/A"}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cantidad Pedida:</span>
                    <span className="font-semibold text-foreground">
                      {delivery.order?.quantity || 0} {delivery.order?.product?.unit?.toLowerCase() || ""}
                    </span>
                  </div>
                  {delivery.loadedQuantity > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Cantidad Cargada:</span>
                      <span className="font-semibold text-foreground">
                        {delivery.loadedQuantity} {delivery.order?.product?.unit?.toLowerCase() || ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Driver Info */}
                {delivery.order?.truck?.driverName && (
                  <div className="text-xs text-muted-foreground">Conductor: {delivery.order.truck.driverName}</div>
                )}

                {/* Notes */}
                {delivery.notes && (
                  <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                    <strong>Notas:</strong> {delivery.notes}
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                  Creado:{" "}
                  {new Date(delivery.createdAt).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {delivery.loadedAt && (
                    <>
                      <br />
                      Cargado:{" "}
                      {new Date(delivery.loadedAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                  {delivery.exitedAt && (
                    <>
                      <br />
                      Salida:{" "}
                      {new Date(delivery.exitedAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron despachos</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Intenta con otros términos de búsqueda" : "Aún no hay despachos registrados"}
          </p>
        </div>
      )}
    </div>
  )
}
