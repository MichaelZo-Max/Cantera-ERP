"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/lib/types"
import { Search, Eye, FileText, Calendar, User } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"

export default function OrdersListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" })
        if (!res.ok) throw new Error(await res.text())
        const data: Order[] = await res.json()
        setOrders(data)
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar pedidos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredOrders = orders.filter((order) => {
    const q = searchTerm.toLowerCase()
    const orderNumber = order.orderNumber?.toLowerCase() ?? ""
    const clientName = order.client?.nombre?.toLowerCase() ?? ""
    return orderNumber.includes(q) || clientName.includes(q)
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CREADA":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
      case "PAGADA":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
      case "EN_DESPACHO":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      case "CERRADA":
        return "bg-muted text-muted-foreground border-border"
      case "CANCELADA":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "CREADA":
        return "Creada"
      case "PAGADA":
        return "Pagada"
      case "EN_DESPACHO":
        return "En Despacho"
      case "CERRADA":
        return "Cerrada"
      case "CANCELADA":
        return "Cancelada"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <AppLayout title="Lista de Pedidos">
        <div className="p-6">Cargando…</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Lista de Pedidos">
        <div className="p-6 text-destructive">Error: {error}</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Lista de Pedidos">
      <div className="space-y-6">
        <PageHeader
          title="Pedidos"
          description="Consulta y gestiona los pedidos existentes"
          actions={
            <Button asChild>
              <Link href="/cashier/orders" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Nuevo Pedido</span>
              </Link>
            </Button>
          }
        />

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número de pedido o cliente…"
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
            filteredOrders.map((order) => {
              const createdAt = new Date(order.createdAt as unknown as string)
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <CardDescription className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>{createdAt.toLocaleDateString("es-MX")}</span>
                          <span>
                            {createdAt.toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.estado)}>{getStatusText(order.estado)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{order.client?.nombre}</p>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          ${Number(order.total ?? 0).toFixed(2)}
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
              )
            })
          )}
        </div>
      </div>
    </AppLayout>
  )
}
