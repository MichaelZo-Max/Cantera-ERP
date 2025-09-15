"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Truck, Clock, CheckCircle, Package, Eye } from "lucide-react"
import type { Delivery } from "@/lib/types"
import { AnimatedCard } from "@/components/ui/animated-card"
import { EmptyState } from "@/components/ui/empty-state"
import Link from "next/link"

const statusConfig = {
  ASIGNADA: {
    label: "Asignada",
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
  },
  PENDING: {
    label: "Pendiente",
    color: "bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-800",
    icon: Clock,
  },
  EN_CARGA: {
    label: "En Carga",
    color:
      "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-800",
    icon: Package,
  },
  LOADING: {
    label: "Cargando",
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
  LOADED: {
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
  EXITED: {
    label: "Despachado",
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

export function CashierDeliveriesClientUI({
  initialDeliveries,
}: {
  initialDeliveries: Delivery[]
}) {
  console.log("[v0] Initial deliveries received:", initialDeliveries)

  const [searchTerm, setSearchTerm] = useState("")
  const [deliveries] = useState<Delivery[]>(initialDeliveries)

  const filteredDeliveries = useMemo(
    () =>
      deliveries.filter((delivery) => {
        const q = searchTerm.toLowerCase()
        const placa = delivery.truck?.placa?.toLowerCase() ?? ""
        const cliente = delivery.client?.name?.toLowerCase() ?? ""
        const orderNumber = delivery.order?.orderNumber?.toLowerCase() ?? ""
        const id = String(delivery.id)?.toLowerCase() ?? ""
        return placa.includes(q) || cliente.includes(q) || id.includes(q) || orderNumber.includes(q)
      }),
    [deliveries, searchTerm],
  )

  const deliveriesByOrder = useMemo(() => {
    const grouped = new Map<string, Delivery[]>()
    filteredDeliveries.forEach((delivery) => {
      const orderId = delivery.orderId
      if (!grouped.has(orderId)) {
        grouped.set(orderId, [])
      }
      grouped.get(orderId)!.push(delivery)
    })
    grouped.forEach((orderDeliveries) => {
      orderDeliveries.sort((a, b) => {
        const dateA = new Date(a.createdAt as unknown as string).getTime()
        const dateB = new Date(b.createdAt as unknown as string).getTime()
        return dateA - dateB
      })
    })
    return grouped
  }, [filteredDeliveries])

  const completedDeliveriesCount = useMemo(
    () => deliveries.filter((d) => d.estado === "SALIDA_OK" || d.estado === "EXITED").length,
    [deliveries],
  )

  const inProgressDeliveriesCount = useMemo(
    () => deliveries.length - completedDeliveriesCount,
    [deliveries, completedDeliveriesCount],
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Seguimiento de Despachos
          </h1>
          <p className="text-muted-foreground mt-1">Monitorea el estado de múltiples viajes por orden</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{completedDeliveriesCount} Completados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span>{inProgressDeliveriesCount} En Proceso</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por placa, cliente, orden o ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="space-y-6">
        {Array.from(deliveriesByOrder.entries()).length > 0 ? (
          Array.from(deliveriesByOrder.entries()).map(([orderId, orderDeliveries], orderIndex) => {
            const firstDelivery = orderDeliveries[0]
            const completedTrips = orderDeliveries.filter(
              (d) => d.estado === "SALIDA_OK" || d.estado === "EXITED",
            ).length

            return (
              <AnimatedCard
                key={orderId}
                hoverEffect="lift"
                animateIn
                delay={orderIndex * 100}
                className="glass overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">
                        Orden {firstDelivery.order?.orderNumber || orderId}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">{firstDelivery.client?.name || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        {completedTrips}/{orderDeliveries.length} Viajes Completados
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/cashier/orders/${orderId}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Orden
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {orderDeliveries.map((delivery, deliveryIndex) => {
                      const conf = statusConfig[delivery.estado as keyof typeof statusConfig]
                      const StatusIcon = conf?.icon ?? Clock
                      const statusStyle = conf?.color ?? ""
                      const statusLabel = conf?.label ?? delivery.estado

                      const createdAt = delivery.createdAt ? new Date(delivery.createdAt as unknown as string) : null
                      const loadedAt = delivery.loadedAt ? new Date(delivery.loadedAt as unknown as string) : null
                      const exitedAt = delivery.exitedAt ? new Date(delivery.exitedAt as unknown as string) : null

                      return (
                        <Card key={delivery.id} className="border-2">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-sm">Viaje #{deliveryIndex + 1}</span>
                              </div>
                              <Badge className={`${statusStyle} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusLabel}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{delivery.truck?.placa || "N/A"}</p>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {delivery.items && delivery.items.length > 0 && (
                              <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Items del viaje:</p>
                                {delivery.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex justify-between text-xs">
                                    <span>{item.orderItem?.product?.name || "Producto"}</span>
                                    <span className="font-medium">
                                      {item.dispatched_quantity} {item.orderItem?.product?.unit || ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Cantidad Total:</span>
                                <span className="font-semibold">{delivery.cantidadBase}</span>
                              </div>
                              {!!delivery.loadedQuantity && delivery.loadedQuantity > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Cargada:</span>
                                  <span className="font-semibold text-green-600">{delivery.loadedQuantity}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                              {createdAt && (
                                <div>
                                  Creado:{" "}
                                  {createdAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                                </div>
                              )}
                              {loadedAt && (
                                <div>
                                  Cargado:{" "}
                                  {loadedAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                                </div>
                              )}
                              {exitedAt && (
                                <div>
                                  Salida: {exitedAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </AnimatedCard>
            )
          })
        ) : (
          <Card className="glass">
            <CardContent className="pt-6">
              <EmptyState
                icon={<Truck className="h-12 w-12" />}
                title="No se encontraron despachos"
                description={searchTerm ? "Intenta con otros términos de búsqueda" : "Aún no hay despachos registrados"}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
