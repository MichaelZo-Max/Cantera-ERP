"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Truck, MapPin, Package, Clock, CheckCircle } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import type { Delivery } from "@/lib/types"

const statusConfig = {
  ASIGNADA: {
    label: "Asignada",
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
  },
  EN_CARGA: {
    label: "En Carga",
    color:
      "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-800",
    icon: Package,
  },
  CARGADA: {
    label: "Cargada",
    color:
      "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle,
  },
  SALIDA_OK: {
    label: "Salida OK",
    color:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle,
  },
  RECHAZADA: {
    label: "Rechazada",
    color: "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800",
    icon: Clock,
  },
} as const

export default function CashierDeliveriesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
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
    load()
  }, [])

  const filteredDeliveries = deliveries.filter((delivery) => {
    const q = searchTerm.toLowerCase()
    const placa = delivery.truck?.placa?.toLowerCase() ?? ""
    const cliente = delivery.client?.nombre?.toLowerCase() ?? ""
    const id = String(delivery.id)?.toLowerCase() ?? ""
    return placa.includes(q) || cliente.includes(q) || id.includes(q)
  })

  if (loading) {
    return (
      <AppLayout title="Seguimiento de Despachos">
        <div className="p-6">Cargando…</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Seguimiento de Despachos">
        <div className="p-6 text-destructive">Error: {error}</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Seguimiento de Despachos">
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
              <span>{filteredDeliveries.filter((d) => d.estado === "SALIDA_OK").length} Completados</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{filteredDeliveries.filter((d) => d.estado !== "SALIDA_OK").length} En Proceso</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por placa, cliente o ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Deliveries Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredDeliveries.map((delivery) => {
            const conf = statusConfig[delivery.estado as keyof typeof statusConfig]
            const StatusIcon = conf?.icon ?? Clock
            const statusStyle = conf?.color ?? ""
            const statusLabel = conf?.label ?? delivery.estado

            const createdAt = delivery.createdAt ? new Date(delivery.createdAt as unknown as string) : null
            const loadedAt = delivery.loadedAt ? new Date(delivery.loadedAt as unknown as string) : null
            const exitedAt = delivery.exitedAt ? new Date(delivery.exitedAt as unknown as string) : null

            return (
              <Card key={delivery.id} className="hover:shadow-lg transition-all duration-200 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-semibold">{delivery.truck?.placa || "N/A"}</CardTitle>
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
                      <span className="font-medium text-foreground">{delivery.client?.nombre || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Orden #{delivery.order?.orderNumber || delivery.orderId}</span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Cantidad Pedida:</span>
                      <span className="font-semibold text-foreground">
                        {delivery.cantidadBase}
                      </span>
                    </div>
                    {!!delivery.loadedQuantity && delivery.loadedQuantity > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Cantidad Cargada:</span>
                        <span className="font-semibold text-foreground">
                          {delivery.loadedQuantity}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {!!delivery.notes && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                      <strong>Notas:</strong> {delivery.notes}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                    {createdAt && (
                      <>
                        Creado:{" "}
                        {createdAt.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                    {loadedAt && (
                      <>
                        <br />
                        Cargado:{" "}
                        {loadedAt.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                    {exitedAt && (
                      <>
                        <br />
                        Salida:{" "}
                        {exitedAt.toLocaleDateString("es-ES", {
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
    </AppLayout>
  )
}