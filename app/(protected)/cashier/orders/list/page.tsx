"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockOrders } from "@/lib/mock-data"
import type { Order } from "@/lib/types"
import { Search, Eye, FileText, Calendar, Truck, Package, User } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"

export default function OrdersListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders] = useState<Order[]>(mockOrders)

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.truck?.plates.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
      case "LOADED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      case "COMPLETED":
        return "bg-muted text-muted-foreground border-border"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendiente"
      case "IN_PROGRESS":
        return "En Proceso"
      case "LOADED":
        return "Cargado"
      case "COMPLETED":
        return "Completado"
      case "CANCELLED":
        return "Cancelado"
      default:
        return status
    }
  }

  return (
    <AppLayout title="Lista de Pedidos">
      <div className="space-y-6">
        <PageHeader
          title="Pedidos"
          description="Consulta y gestiona los pedidos existentes"
          actions={(
            <Button asChild>
              <Link href="/cashier/orders" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Nuevo Pedido</span>
              </Link>
            </Button>
          )}
        />
        
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número de pedido, cliente, producto o camión..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron pedidos</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                      <CardDescription className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(order.createdAt).toLocaleDateString("es-MX")}</span>
                        <span>
                          {new Date(order.createdAt).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{order.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{order.product?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.quantity} {order.product?.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{order.truck?.plates}</p>
                        <p className="text-xs text-muted-foreground">{order.truck?.driverName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div>
                      <p className="text-lg font-bold text-foreground">${order.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        ${order.pricePerUnit} × {order.quantity} {order.product?.unit}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-transparent">
                      <Eye className="h-4 w-4" />
                      <span>Ver Detalles</span>
                    </Button>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Notas:</span> {order.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}