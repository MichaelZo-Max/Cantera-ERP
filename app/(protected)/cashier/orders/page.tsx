"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { mockCustomers, mockProducts, mockTrucks } from "@/lib/mock-data"
import type { CreateOrderForm } from "@/lib/types"
import { Plus, Calculator } from "lucide-react"
import { toast } from "sonner"

export default function CreateOrderPage() {
  const [formData, setFormData] = useState<CreateOrderForm>({
    customerId: "",
    productId: "",
    truckId: "",
    quantity: 0,
    pricePerUnit: 0,
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const selectedProduct = mockProducts.find((p) => p.id === formData.productId)
  const totalAmount = formData.quantity * formData.pricePerUnit

  const handleProductChange = (productId: string) => {
    const product = mockProducts.find((p) => p.id === productId)
    setFormData({
      ...formData,
      productId,
      pricePerUnit: product?.pricePerUnit || 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate order number
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      toast.success("Pedido creado", { description: `Se creó el pedido ${orderNumber}` })

      console.log("Creating order:", {
        ...formData,
        orderNumber,
        totalAmount,
      })

      setSuccess(true)
      setFormData({
        customerId: "",
        productId: "",
        truckId: "",
        quantity: 0,
        pricePerUnit: 0,
        notes: "",
      })
    } catch (err) {
      setError("Error al crear el pedido"); toast.error("No se pudo crear el pedido")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout title="Crear Pedido">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Crear Nuevo Pedido</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Registra un nuevo pedido de cliente</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Información del Pedido</span>
            </CardTitle>
            <CardDescription className="text-sm">Completa todos los campos requeridos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-medium">
                  Cliente *
                </Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product" className="text-sm font-medium">
                  Producto *
                </Label>
                <Select value={formData.productId} onValueChange={handleProductChange}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            ${product.pricePerUnit}/{product.unit}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {selectedProduct.description} - Precio: ${selectedProduct.pricePerUnit} por {selectedProduct.unit}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="truck" className="text-sm font-medium">
                  Camión *
                </Label>
                <Select
                  value={formData.truckId}
                  onValueChange={(value) => setFormData({ ...formData, truckId: value })}
                >
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Selecciona un camión" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                          <span className="font-medium">{truck.plates}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {truck.brand} {truck.model} ({truck.capacity} {selectedProduct?.unit || "m3"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    Cantidad *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.0"
                    required
                    className="h-10 sm:h-11"
                  />
                  {selectedProduct && (
                    <p className="text-xs sm:text-sm text-muted-foreground">Unidad: {selectedProduct.unit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit" className="text-sm font-medium">
                    Precio por Unidad *
                  </Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pricePerUnit || ""}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              {formData.quantity > 0 && formData.pricePerUnit > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-2">
                        <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-medium text-primary text-sm sm:text-base">Total del Pedido:</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-primary/80 mt-2">
                      {formData.quantity} {selectedProduct?.unit} × ${formData.pricePerUnit} = ${totalAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notas (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instrucciones especiales, comentarios..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !formData.customerId ||
                    !formData.productId ||
                    !formData.truckId ||
                    formData.quantity <= 0 ||
                    formData.pricePerUnit <= 0
                  }
                  className="flex-1 h-11 text-sm sm:text-base font-medium"
                >
                  {isSubmitting ? "Creando..." : "Crear Pedido"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      customerId: "",
                      productId: "",
                      truckId: "",
                      quantity: 0,
                      pricePerUnit: 0,
                      notes: "",
                    })
                    setSuccess(false)
                    setError("")
                  }}
                  className="h-11 text-sm sm:text-base font-medium sm:min-w-24"
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
