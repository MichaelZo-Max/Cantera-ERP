"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { mockOrders, mockCustomers, mockProducts } from "@/lib/mock-data"
import { BarChart3, Calendar, Download, TrendingUp, Package, Users, DollarSign } from "lucide-react"

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportType, setReportType] = useState("sales")
  const [selectedCustomer, setSelectedCustomer] = useState("all-customers")
  const [selectedProduct, setSelectedProduct] = useState("all-products")

  // Mock data calculations
  const totalOrders = mockOrders.length
  const completedOrders = mockOrders.filter((o) => o.status === "COMPLETED").length
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalQuantity = mockOrders.reduce((sum, order) => sum + order.quantity, 0)

  const ordersByStatus = {
    PENDING: mockOrders.filter((o) => o.status === "PENDING").length,
    IN_PROGRESS: mockOrders.filter((o) => o.status === "IN_PROGRESS").length,
    LOADED: mockOrders.filter((o) => o.status === "LOADED").length,
    COMPLETED: mockOrders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: mockOrders.filter((o) => o.status === "CANCELLED").length,
  }

  const customerStats = mockCustomers
    .map((customer) => {
      const customerOrders = mockOrders.filter((o) => o.customerId === customer.id)
      const revenue = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      return {
        customer: customer.name,
        orders: customerOrders.length,
        revenue,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const productStats = mockProducts
    .map((product) => {
      const productOrders = mockOrders.filter((o) => o.productId === product.id)
      const quantity = productOrders.reduce((sum, order) => sum + order.quantity, 0)
      const revenue = productOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      return {
        product: product.name,
        orders: productOrders.length,
        quantity,
        revenue,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "LOADED":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "COMPLETED":
        return "bg-muted text-muted-foreground"
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      default:
        return "bg-muted text-muted-foreground"
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

  const handleExportReport = () => {
    // Mock export functionality
    console.log("Exporting report with filters:", {
      dateFrom,
      dateTo,
      reportType,
      selectedCustomer,
      selectedProduct,
    })
    alert("Reporte exportado exitosamente")
  }

  return (
    <AppLayout title="Reportes">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reportes y Análisis</h2>
          <p className="text-muted-foreground">Consulta estadísticas y genera reportes del sistema</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Filtros de Reporte</span>
            </CardTitle>
            <CardDescription>Configura los parámetros para generar reportes personalizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Fecha Desde</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Fecha Hasta</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Reporte</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Ventas</SelectItem>
                    <SelectItem value="customers">Clientes</SelectItem>
                    <SelectItem value="products">Productos</SelectItem>
                    <SelectItem value="operations">Operaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-customers">Todos los clientes</SelectItem>
                    {mockCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los productos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-products">Todos los productos</SelectItem>
                    {mockProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleExportReport} className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Exportar Reporte</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                  <p className="text-sm text-muted-foreground">Total Pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalQuantity.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">m³ Vendidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {((completedOrders / totalOrders) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Tasa Completado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Pedidos</CardTitle>
            <CardDescription>Distribución de pedidos por estado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="mb-2">
                    <Badge className={getStatusColor(status)} variant="secondary">
                      {getStatusText(status)}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-sm text-muted-foreground">{((count / totalOrders) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Principales Clientes</span>
              </CardTitle>
              <CardDescription>Clientes con mayor volumen de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.customer} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{stat.customer}</p>
                        <p className="text-sm text-muted-foreground">{stat.orders} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${stat.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Productos Más Vendidos</span>
              </CardTitle>
              <CardDescription>Productos con mayor volumen de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.product} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{stat.product}</p>
                        <p className="text-sm text-muted-foreground">{stat.quantity.toFixed(1)} m³</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${stat.revenue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{stat.orders} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recientes</CardTitle>
            <CardDescription>Últimos pedidos registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Pedido</th>
                    <th className="text-left py-3 px-2">Cliente</th>
                    <th className="text-left py-3 px-2">Producto</th>
                    <th className="text-left py-3 px-2">Cantidad</th>
                    <th className="text-left py-3 px-2">Total</th>
                    <th className="text-left py-3 px-2">Estado</th>
                    <th className="text-left py-3 px-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {mockOrders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{order.orderNumber}</td>
                      <td className="py-3 px-2">{order.customer?.name}</td>
                      <td className="py-3 px-2">{order.product?.name}</td>
                      <td className="py-3 px-2">
                        {order.quantity} {order.product?.unit}
                      </td>
                      <td className="py-3 px-2 font-medium">${order.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {getStatusText(order.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{new Date(order.createdAt).toLocaleDateString("es-MX")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
