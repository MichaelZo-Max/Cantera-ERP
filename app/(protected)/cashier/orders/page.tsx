"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductPicker } from "@/components/forms/product-picker"
import { QuantityInput } from "@/components/forms/quantity-input"
import { TruckPlateInput } from "@/components/forms/truck-plate-input"
import { PhotoInput } from "@/components/forms/photo-input"
import { Plus, Trash2, Calculator, CreditCard, Truck } from "lucide-react"
import { toast } from "sonner"
import type { Client, Destination, Product, ProductFormat, ProductSelection, CreateOrderForm } from "@/lib/types"

// Mock data - En producción vendría de la API
const mockClients: Client[] = [
  {
    id: "1",
    nombre: "Constructora Los Andes",
    rif: "J-12345678-9",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    nombre: "Obras Civiles CA",
    rif: "J-87654321-0",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockDestinations: Destination[] = [
  {
    id: "1",
    clientId: "1",
    nombre: "Obra Av. Norte",
    direccion: "Av. Norte, Caracas",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    clientId: "1",
    nombre: "Proyecto Residencial",
    direccion: "Urb. Los Palos Grandes",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    clientId: "2",
    nombre: "Puente Autopista",
    direccion: "Autopista Regional",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockProducts: Product[] = [
  {
    id: "1",
    codigo: "AGR001",
    nombre: "Grava 3/4",
    area: "AGREGADOS",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    codigo: "AGR002",
    nombre: "Arena Lavada",
    area: "AGREGADOS",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    codigo: "ASF001",
    nombre: "Asfalto RC-250",
    area: "ASFALTOS",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockFormats: ProductFormat[] = [
  {
    id: "1",
    productId: "1",
    unidadBase: "M3",
    factorUnidadBase: 1,
    sku: "A granel (m³)",
    pricePerUnit: 25.5,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    productId: "1",
    unidadBase: "TON",
    factorUnidadBase: 1.6,
    sku: "Por tonelada",
    pricePerUnit: 40.8,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    productId: "2",
    unidadBase: "M3",
    factorUnidadBase: 1,
    sku: "A granel (m³)",
    pricePerUnit: 22.0,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    productId: "3",
    unidadBase: "TON",
    factorUnidadBase: 1,
    sku: "Tanque",
    pricePerUnit: 850.0,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

interface OrderItem {
  id: string
  productSelection: ProductSelection
  product?: Product
  format?: ProductFormat
  quantity: number
  pricePerUnit: number
  subtotal: number
}

export default function CashierOrderPage() {
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedDestination, setSelectedDestination] = useState<string>("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // Constructor de items
  const [currentProduct, setCurrentProduct] = useState<ProductSelection | null>(null)
  const [currentQuantity, setCurrentQuantity] = useState<number>(0)

  // Pago y camión
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [truckPlate, setTruckPlate] = useState<string>("")
  const [truckPhoto, setTruckPhoto] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Obtener destinos disponibles para el cliente seleccionado
  const availableDestinations = mockDestinations.filter((d) => d.clientId === selectedClient)

  // Obtener formato seleccionado actual
  const currentFormat = currentProduct ? mockFormats.find((f) => f.id === currentProduct.formatId) : null

  // Calcular totales
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.16 // IVA 16%
  const total = subtotal + tax

  const handleAddItem = () => {
    if (!currentProduct || currentQuantity <= 0) {
      toast.error("Selecciona un producto y cantidad válida")
      return
    }

    const product = mockProducts.find((p) => p.id === currentProduct.productId)
    const format = mockFormats.find((f) => f.id === currentProduct.formatId)

    if (!product || !format) {
      toast.error("Producto o formato no encontrado")
      return
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      productSelection: currentProduct,
      product,
      format,
      quantity: currentQuantity,
      pricePerUnit: format.pricePerUnit || 0,
      subtotal: currentQuantity * (format.pricePerUnit || 0),
    }

    setOrderItems([...orderItems, newItem])

    // Limpiar constructor
    setCurrentProduct(null)
    setCurrentQuantity(0)

    toast.success("Item agregado a la comanda")
  }

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId))
    toast.success("Item eliminado")
  }

  const handleAuthorizeDispatch = async () => {
    if (!selectedClient || orderItems.length === 0 || !truckPlate) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setIsSubmitting(true)

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      const orderData: CreateOrderForm = {
        clientId: selectedClient,
        destinationId: selectedDestination || undefined,
        items: orderItems.map((item) => ({
          productFormatId: item.format!.id,
          cantidadBase: item.quantity,
        })),
        pago: {
          metodo: paymentMethod,
          monto: total,
          ref: paymentReference,
        },
        truck: {
          placa: truckPlate,
        },
        photoFile: truckPhoto || undefined,
      }

      console.log("Creating order:", { orderNumber, ...orderData })

      toast.success("Despacho autorizado", {
        description: `Orden ${orderNumber} creada exitosamente`,
      })

      // Limpiar formulario
      setSelectedClient("")
      setSelectedDestination("")
      setOrderItems([])
      setPaymentMethod("")
      setPaymentReference("")
      setTruckPlate("")
      setTruckPhoto(null)
    } catch (error) {
      toast.error("Error al autorizar despacho")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canAuthorize = selectedClient && orderItems.length > 0 && truckPlate && paymentMethod

  return (
    <AppLayout title="Comanda y Pago">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cliente y Destino</CardTitle>
            <CardDescription>Selecciona el cliente y destino para la orden</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div>
                        <div className="font-medium">{client.nombre}</div>
                        {client.rif && <div className="text-sm text-muted-foreground">{client.rif}</div>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={selectedDestination} onValueChange={setSelectedDestination} disabled={!selectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona destino..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDestinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id}>
                      <div>
                        <div className="font-medium">{destination.nombre}</div>
                        {destination.direccion && (
                          <div className="text-sm text-muted-foreground">{destination.direccion}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Constructor de items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Constructor de Items
              </CardTitle>
              <CardDescription>Agrega productos a la comanda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductPicker
                value={currentProduct}
                onChange={setCurrentProduct}
                products={mockProducts}
                formats={mockFormats}
              />

              {currentFormat && (
                <QuantityInput
                  unitBase={currentFormat.unidadBase}
                  value={currentQuantity}
                  onChange={setCurrentQuantity}
                />
              )}

              {currentFormat && currentQuantity > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">
                      ${(currentQuantity * (currentFormat.pricePerUnit || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handleAddItem} disabled={!currentProduct || currentQuantity <= 0} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Método de pago *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Número de referencia..."
                  />
                </div>
              </div>

              {/* Asociar camión */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Asociar Camión
                </h4>

                <TruckPlateInput value={truckPlate} onChange={setTruckPlate} required />

                <PhotoInput onSelect={setTruckPhoto} label="Foto del camión (opcional)" capture={true} />
              </div>
            </CardContent>
          </Card>
        </div>

        {orderItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items de la Comanda</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto/Formato</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Unit.</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product?.nombre}</div>
                          <div className="text-sm text-muted-foreground">{item.format?.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.format?.unidadBase}
                      </TableCell>
                      <TableCell>${item.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleAuthorizeDispatch}
            disabled={!canAuthorize || isSubmitting}
            size="lg"
            className="min-w-[200px]"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {isSubmitting ? "Procesando..." : "Autorizar Despacho"}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
