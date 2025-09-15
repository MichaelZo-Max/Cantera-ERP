"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Order, OrderProgress } from "@/lib/types"
import { Search, Eye, FileText, Calendar, User, Truck, Package } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { AnimatedCard } from "@/components/ui/animated-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Progress } from "@/components/ui/progress"

const getStatusConfig = (status: string) => {
  switch (status) {
    case "CREADA":
    case "AWAITING_PAYMENT":
      return {
        label: "Esperando Pago",
        color:
          "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
      }
    case "PAGADA":
    case "PAID":
      return {
        label: "Pagada",
        color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      }
    case "EN_DESPACHO":
    case "PARTIALLY_DISPATCHED":
      return {
        label: "Despacho Parcial",
        color:
          "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      }
    case "CERRADA":
    case "DISPATCHED_COMPLETE":
      return {
        label: "Completada",
        color:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      }
    case "CANCELADA":
    case "CANCELLED":
      return {
        label: "Cancelada",
        color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      }
    default:
      return {
        label: status,
        color: "bg-muted text-muted-foreground border-border",
      }
  }
}

const calculateOrderProgress = (order: Order): OrderProgress => {
  console.log("[v0] Calculating progress for order:", order.id, order)

  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const dispatchedItems =
    order.deliveries?.reduce(
      (sum, delivery) => sum + (delivery.items?.reduce((itemSum, item) => itemSum + item.dispatched_quantity, 0) || 0),
      0,
    ) || 0

  const completedTrips = order.deliveries?.filter((d) => d.estado === "SALIDA_OK" || d.estado === "EXITED").length || 0
  const totalTrips = order.deliveries?.length || 0

  const progress = {
    orderId: String(order.id),
    totalItems,
    dispatchedItems,
    pendingItems: totalItems - dispatchedItems,
    completedTrips,
    totalTrips,
    status: order.status,
  }

  console.log("[v0] Calculated progress:", progress)
  return progress
}

export function OrdersListClientUI({
  initialOrders,
}: {
  initialOrders: Order[]
}) {
  console.log("[v0] Orders received in component:", initialOrders)

  const [searchTerm, setSearchTerm] = useState("")
  const [orders] = useState<Order[]>(initialOrders)

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders
    return orders.filter((order) => {
      const q = searchTerm.toLowerCase()
      const orderNumber = order.order_number?.toLowerCase() ?? ""
      const clientName = order.client_name?.toLowerCase() ?? ""
      return orderNumber.includes(q) || clientName.includes(q)
    })
  }, [orders, searchTerm])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Consulta y gestiona los pedidos con seguimiento de múltiples viajes"
        actions={
          <Button asChild>
            <Link href="/cashier/orders" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Nuevo Pedido</span>
            </Link>
          </Button>
        }
      />

      <AnimatedCard>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por número de pedido o cliente…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No se encontraron pedidos"
          description={searchTerm ? "Intenta con otros términos de búsqueda." : "Crea un nuevo pedido para comenzar."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => {
            const createdAt = new Date(order.created_at as unknown as string)
            const statusConfig = getStatusConfig(order.status)
            const progress = calculateOrderProgress(order)
            const progressPercentage =
              progress.totalItems > 0 ? (progress.dispatchedItems / progress.totalItems) * 100 : 0

            return (
              <AnimatedCard key={order.id} hoverEffect="lift" animateIn delay={index * 50} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {order.order_number}
                      </CardTitle>
                    </div>
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.client_name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {createdAt.toLocaleDateString("es-VE", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {progress.totalTrips > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Viajes:</span>
                        </div>
                        <span className="font-medium">
                          {progress.completedTrips}/{progress.totalTrips}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Despachado:</span>
                        </div>
                        <span className="font-medium">
                          {progress.dispatchedItems.toFixed(1)}/{progress.totalItems.toFixed(1)}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}

                  {order.notes && (
                    <div className="mt-2 p-2 bg-muted/30 rounded-md text-xs text-muted-foreground">
                      <strong>Notas:</strong> {order.notes}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t flex justify-between items-center">
                  <p className="text-xl font-bold text-foreground">${Number(order.total ?? 0).toFixed(2)}</p>
                </CardFooter>
              </AnimatedCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
