"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Truck, Clock, CheckCircle, Package, Eye, ChevronDown } from "lucide-react"
import type { Delivery } from "@/lib/types"
import { AnimatedCard } from "@/components/ui/animated-card"
import { EmptyState } from "@/components/ui/empty-state"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Objeto de configuración de estados
const statusConfig = {
  PENDING: {
    label: "Pendiente",
    color: "bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-800",
    icon: Clock,
  },
  CARGADA: {
    label: "Cargada en Patio",
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
    icon: Package,
  },
  EXITED: {
    label: "Despachado",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle,
  },
} as const

export function CashierDeliveriesClientUI({
  initialDeliveries,
}: {
  initialDeliveries: Delivery[]
}) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDeliveries = useMemo(
    () =>
      initialDeliveries.filter((delivery) => {
        const q = searchTerm.toLowerCase()
        const placa = delivery.truck?.placa?.toLowerCase() ?? ""
        const cliente = delivery.orderDetails.client?.name?.toLowerCase() ?? ""
        const orderNumber = delivery.orderDetails.order_number?.toLowerCase() ?? ""
        const id = String(delivery.delivery_id)?.toLowerCase() ?? ""
        return placa.includes(q) || cliente.includes(q) || id.includes(q) || orderNumber.includes(q)
      }),
    [initialDeliveries, searchTerm],
  )

  const deliveriesByOrder = useMemo(() => {
    const grouped = new Map<string, Delivery[]>()
    filteredDeliveries.forEach((delivery) => {
      const orderId = String(delivery.orderDetails.id)
      if (!grouped.has(orderId)) {
        grouped.set(orderId, [])
      }
      grouped.get(orderId)!.push(delivery)
    })
    grouped.forEach((orderDeliveries) => {
      orderDeliveries.sort((a, b) => a.delivery_id - b.delivery_id)
    })
    return grouped
  }, [filteredDeliveries])

  const completedDeliveriesCount = useMemo(
    () => initialDeliveries.filter((d) => d.estado === "EXITED").length,
    [initialDeliveries],
  )

  const inProgressDeliveriesCount = initialDeliveries.length - completedDeliveriesCount

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
      <AnimatedCard hoverEffect="lift">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por placa, cliente, orden o ID de viaje…"
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
            const completedTrips = orderDeliveries.filter(d => d.estado === "EXITED").length

            return (
              <Collapsible key={orderId} defaultOpen>
                <AnimatedCard
                  hoverEffect="lift"
                  animateIn
                  delay={orderIndex * 100}
                  className="overflow-hidden"
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 bg-muted/30 cursor-pointer hover:bg-muted/40 transition-colors group">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-xl font-bold">
                            Orden {firstDelivery.orderDetails.order_number || orderId}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">{firstDelivery.orderDetails.client?.name || "N/A"}</p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <Badge variant="outline">
                            {completedTrips}/{orderDeliveries.length} Viajes Completados
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/cashier/orders/${orderId}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Orden Completa
                            </Link>
                          </Button>
                          <ChevronDown className="h-5 w-5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-4">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {orderDeliveries.map((delivery) => {
                          const conf = statusConfig[delivery.estado as keyof typeof statusConfig] || statusConfig.PENDING;
                          const StatusIcon = conf.icon;
                          const hasItemsLoaded = delivery.dispatchItems && delivery.dispatchItems.length > 0

                          return (
                            <Card key={delivery.delivery_id} className="border-2 flex flex-col">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm">Viaje #{delivery.delivery_id}</span>
                                  </div>
                                  <Badge className={`${conf.color} text-xs`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {conf.label}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium pt-1">{delivery.truck?.placa || "N/A"}</p>
                              </CardHeader>
                              <CardContent className="space-y-2 flex-grow pt-2 pb-4">
                                {/* --- VISTA DE PRODUCTOS CARGADOS --- */}
                                {hasItemsLoaded ? (
                                    <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                                        {delivery.dispatchItems?.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground truncate pr-2">
                                                    {item.orderItem?.product?.name || 'Producto desconocido'}
                                                </span>
                                                <span className="font-semibold text-sm text-foreground whitespace-nowrap">
                                                    {item.dispatched_quantity?.toFixed(2) ?? '0.00'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground text-center italic py-2">
                                        Pendiente por cargar
                                    </div>
                                )}
                              </CardContent>
                              {/* Se elimina el CardFooter para no mostrar el botón "Ver en Patio" */}
                            </Card>
                          )
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </AnimatedCard>
              </Collapsible>
            )
          })
        ) : (
          <Card>
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