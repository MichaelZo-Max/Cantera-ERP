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
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportType, setReportType] = useState("sales")
  const [selectedCustomer, setSelectedCustomer] = useState("all-customers")
  const [selectedProduct, setSelectedProduct] = useState("all-products")
  const [selectedStatus, setSelectedStatus] = useState("all-status")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const filteredOrders = mockOrders.filter((order) => {
    const matchesCustomer = selectedCustomer === "all-customers" || order.customerId === selectedCustomer
    const matchesProduct = selectedProduct === "all-products" || order.productId === selectedProduct
    const matchesStatus = selectedStatus === "all-status" || order.status === selectedStatus

    let matchesDateRange = true
    if (dateFrom && dateTo) {
      const orderDate = new Date(order.createdAt)
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      matchesDateRange = orderDate >= fromDate && orderDate <= toDate
    }

    return matchesCustomer && matchesProduct && matchesStatus && matchesDateRange
  })

  const totalOrders = filteredOrders.length
  const completedOrders = filteredOrders.filter((o) => o.status === "COMPLETED").length
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0)

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  const ordersByStatus = {
    PENDING: filteredOrders.filter((o) => o.status === "PENDING").length,
    IN_PROGRESS: filteredOrders.filter((o) => o.status === "IN_PROGRESS").length,
    LOADED: filteredOrders.filter((o) => o.status === "LOADED").length,
    COMPLETED: filteredOrders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: filteredOrders.filter((o) => o.status === "CANCELLED").length,
  }

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

  const exportToCSV = () => {
    const headers = ["Pedido", "Cliente", "Producto", "Cantidad", "Total", "Estado", "Fecha"]
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          order.orderNumber,
          `"${order.customer?.name || ""}"`,
          `"${order.product?.name || ""}"`,
          `${order.quantity} ${order.product?.unit || ""}`,
          order.totalAmount.toFixed(2),
          order.status,
          new Date(order.createdAt).toLocaleDateString("es-MX"),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte_${reportType}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Reporte ${reportType.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
            .metric { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</h1>
            <p>Generado el ${new Date().toLocaleDateString("es-MX")}</p>
          </div>
          <div class="metrics">
            <div class="metric"><h3>${totalOrders}</h3><p>Total Pedidos</p></div>
            <div class="metric"><h3>$${totalRevenue.toFixed(2)}</h3><p>Ingresos</p></div>
            <div class="metric"><h3>${totalQuantity.toFixed(1)} m³</h3><p>Cantidad</p></div>
            <div class="metric"><h3>${totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : "0"}%</h3><p>Completados</p></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Estado</th><th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders
                .map(
                  (order) => `
                <tr>
                  <td>${order.orderNumber}</td>
                  <td>${order.customer?.name || ""}</td>
                  <td>${order.product?.name || ""}</td>
                  <td>${order.quantity} ${order.product?.unit || ""}</td>
                  <td>$${order.totalAmount.toFixed(2)}</td>
                  <td>${order.status}</td>
                  <td>${new Date(order.createdAt).toLocaleDateString("es-MX")}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExportReport = (format: "csv" | "pdf") => {
    if (format === "csv") {
      exportToCSV()
    } else {
      exportToPDF()
    }
  }

  const customerStats = mockCustomers
    .map((customer) => {
      const customerOrders = filteredOrders.filter((o) => o.customerId === customer.id)
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
      const productOrders = filteredOrders.filter((o) => o.productId === product.id)
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">Todos los estados</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                    <SelectItem value="LOADED">Cargado</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <Button
                onClick={() => handleExportReport("csv")}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Exportar CSV</span>
              </Button>
              <Button onClick={() => handleExportReport("pdf")} className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Exportar PDF</span>
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
                    {totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : "0"}%
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
                  <p className="text-sm text-muted-foreground">
                    {totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : "0"}%
                  </p>
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

        {/* Recent Orders Table with Pagination */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Filtrados</CardTitle>
            <CardDescription>
              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalOrders)} de {totalOrders} pedidos
            </CardDescription>
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
                  {paginatedOrders.map((order) => (
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
