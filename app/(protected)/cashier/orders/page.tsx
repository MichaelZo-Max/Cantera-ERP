"use client"

import { useEffect, useMemo, useState } from "react"
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
  // selección
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedDestination, setSelectedDestination] = useState<string>("")

  // catálogo desde API
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [formats, setFormats] = useState<ProductFormat[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])

  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState<string | null>(null)

  // items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [currentProduct, setCurrentProduct] = useState<ProductSelection | null>(null)
  const [currentQuantity, setCurrentQuantity] = useState<number>(0)

  // pago y camión
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [truckPlate, setTruckPlate] = useState<string>("")
  const [truckPhoto, setTruckPhoto] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar clientes, productos, formatos
  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, pRes, fRes] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/product-formats", { cache: "no-store" }),
        ])
        if (!cRes.ok) throw new Error(await cRes.text())
        if (!pRes.ok) throw new Error(await pRes.text())
        if (!fRes.ok) throw new Error(await fRes.text())

        setClients(await cRes.json())
        setProducts(await pRes.json())
        setFormats(await fRes.json())
      } catch (e: any) {
        setErrorData(e?.message ?? "Error cargando catálogos")
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  // Destinos por cliente
  useEffect(() => {
    if (!selectedClient) {
      setDestinations([])
      setSelectedDestination("")
      return
    }
    const loadDestinations = async () => {
      try {
        const res = await fetch(`/api/destinations?clientId=${selectedClient}`, { cache: "no-store" })
        if (!res.ok) throw new Error(await res.text())
        setDestinations(await res.json())
      } catch {
        setDestinations([])
      }
    }
    loadDestinations()
  }, [selectedClient])

  // Helpers
  const currentFormat = useMemo(
    () => (currentProduct ? formats.find((f) => f.id === currentProduct.formatId) ?? null : null),
    [currentProduct, formats]
  )
  const findProduct = (id: string) => products.find((p) => p.id === id)
  const findFormat = (id: string) => formats.find((f) => f.id === id)

  // Totales
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax

  // Acciones items
  const handleAddItem = () => {
    if (!currentProduct || currentQuantity <= 0) {
      toast.error("Selecciona un producto y cantidad válida")
      return
    }
    const product = findProduct(currentProduct.productId)
    const format = findFormat(currentProduct.formatId)
    if (!product || !format) {
      toast.error("Producto o formato no encontrado")
      return
    }

    const price = Number(format.pricePerUnit ?? 0)
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      productSelection: currentProduct,
      product,
      format,
      quantity: currentQuantity,
      pricePerUnit: price,
      subtotal: currentQuantity * price,
    }
    setOrderItems((prev) => [...prev, newItem])
    setCurrentProduct(null)
    setCurrentQuantity(0)
    toast.success("Item agregado a la comanda")
  }

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId))
    toast.success("Item eliminado")
  }

  // Autorizar (POST /api/orders)
  const handleAuthorizeDispatch = async () => {
    if (!selectedClient || orderItems.length === 0 || !truckPlate || !paymentMethod) {
      toast.error("Completa los campos requeridos")
      return
    }
    setIsSubmitting(true)
    try {
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
        truck: { placa: truckPlate },
        // Nota: si necesitas enviar foto real, cambia a FormData (multipart)
        // y ajusta tu route handler para leer archivos.
        // photoFile: truckPhoto || undefined,
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })
      if (!res.ok) throw new Error(await res.text())
      const { order, delivery } = await res.json()

      toast.success(`Orden ${order?.orderNumber ?? ""} creada`, {
        description: delivery ? `Despacho ${delivery.id} asignado` : undefined,
      })

      // Reset
      setSelectedClient("")
      setSelectedDestination("")
      setOrderItems([])
      setPaymentMethod("")
      setPaymentReference("")
      setTruckPlate("")
      setTruckPhoto(null)
    } catch (err: any) {
      toast.error("Error al autorizar despacho", { description: err?.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canAuthorize = !!selectedClient && orderItems.length > 0 && !!truckPlate && !!paymentMethod

  if (loadingData) {
    return (
      <AppLayout title="Comanda y Pago">
        <div className="p-6">Cargando catálogos…</div>
      </AppLayout>
    )
  }
  if (errorData) {
    return (
      <AppLayout title="Comanda y Pago">
        <div className="p-6 text-destructive">Error: {errorData}</div>
      </AppLayout>
    )
  }

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
              <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setSelectedDestination("") }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
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
              <Select
                value={selectedDestination}
                onValueChange={setSelectedDestination}
                disabled={!selectedClient || destinations.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona destino..." />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((destination) => (
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
                products={products}
                formats={formats}
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
                      {(currentQuantity * Number(currentFormat.pricePerUnit ?? 0)).toFixed(2)}
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
