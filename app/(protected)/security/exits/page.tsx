"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PhotoInput } from "@/components/forms/photo-input"
import {
  Search,
  Shield,
  Truck,
  Package,
  User,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Camera,
  FileText,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import type { Delivery, DispatchGuide } from "@/lib/types"

// Mock data - En producción vendría de la API
const mockLoadedDeliveries: (Delivery & {
  order?: {
    id: string
    clientId: string
    destinationId: string
    estado: string
    total: number
    createdBy: string
    createdAt: Date
    updatedAt: Date
    client?: { id: string; nombre: string; isActive: boolean; createdAt: Date; updatedAt: Date }
    destination?: { id: string; clientId: string; nombre: string; isActive: boolean; createdAt: Date; updatedAt: Date }
  }
  truck?: { id: string; placa: string; isActive: boolean; createdAt: Date; updatedAt: Date }
  productFormat?: {
    product?: { nombre: string }
    sku?: string
    unidadBase: string
  }
  loadPhoto?: string // URL de la foto del patio
})[] = [
  {
    id: "d1",
    orderId: "o1",
    truckId: "t1",
    cantidadBase: 10,
    estado: "CARGADA",
    loadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: "o1",
      clientId: "c1",
      destinationId: "dest1",
      estado: "PAGADA",
      total: 5000,
      createdBy: "cashier-user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      client: {
        id: "c1",
        nombre: "Constructora Los Andes",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      destination: {
        id: "dest1",
        clientId: "c1",
        nombre: "Obra Av. Norte",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    truck: {
      id: "t1",
      placa: "ABC-12D",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    productFormat: {
      product: { nombre: "Grava 3/4" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
    loadPhoto: "/truck-loading-gravel.png",
    notes: "Carga completa sin observaciones",
  },
  {
    id: "d2",
    orderId: "o2",
    truckId: "t2",
    cantidadBase: 15,
    estado: "CARGADA",
    loadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: "o2",
      clientId: "c2",
      destinationId: "dest2",
      estado: "PAGADA",
      total: 7500,
      createdBy: "cashier-user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      client: {
        id: "c2",
        nombre: "Obras Civiles CA",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      destination: {
        id: "dest2",
        clientId: "c2",
        nombre: "Puente Autopista",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    truck: {
      id: "t2",
      placa: "XYZ-34E",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    productFormat: {
      product: { nombre: "Arena Lavada" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
    loadPhoto: "/truck-loading-sand.png",
  },
]

const mockExitedDeliveries: typeof mockLoadedDeliveries = [
  {
    id: "d3",
    orderId: "o3",
    truckId: "t3",
    cantidadBase: 8,
    estado: "SALIDA_OK",
    loadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    exitedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: "o3",
      clientId: "c3",
      destinationId: "dest3",
      estado: "PAGADA",
      total: 4000,
      createdBy: "cashier-user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      client: {
        id: "c3",
        nombre: "Constructora Los Andes",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      destination: {
        id: "dest3",
        clientId: "c3",
        nombre: "Proyecto Residencial",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    truck: {
      id: "t3",
      placa: "DEF-56F",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    productFormat: {
      product: { nombre: "Grava 3/4" },
      sku: "A granel (m³)",
      unidadBase: "M3",
    },
  },
]

export default function SecurityExitsPage() {
  const [loadedDeliveries, setLoadedDeliveries] = useState(mockLoadedDeliveries)
  const [exitedDeliveries, setExitedDeliveries] = useState(mockExitedDeliveries)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedDelivery, setSelectedDelivery] = useState<(typeof mockLoadedDeliveries)[0] | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [exitPhoto, setExitPhoto] = useState<File | null>(null)
  const [exitNotes, setExitNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtrar deliveries por búsqueda
  const filteredDeliveries = loadedDeliveries.filter((delivery) => {
    const query = searchQuery.toLowerCase()
    return (
      delivery.truck?.placa.toLowerCase().includes(query) ||
      delivery.id.toLowerCase().includes(query) ||
      delivery.order?.client?.nombre.toLowerCase().includes(query)
    )
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleSelectDelivery = (delivery: (typeof mockLoadedDeliveries)[0]) => {
    // Validaciones según el contrato
    if (delivery.estado !== "CARGADA") {
      toast.error("El viaje no está cargado", {
        description: "Solo se pueden autorizar viajes que estén cargados",
      })
      return
    }

    setSelectedDelivery(delivery)
    setExitPhoto(null)
    setExitNotes("")
    setShowExitModal(true)
  }

  const handleAuthorizeExit = async () => {
    if (!selectedDelivery || !exitPhoto) {
      toast.error("Foto de salida requerida", {
        description: "Debes tomar una foto de la placa del camión",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generar guía de despacho
      const guideNumber = `GD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const dispatchGuide: DispatchGuide = {
        id: `guide-${Date.now()}`,
        deliveryId: selectedDelivery.id,
        numeroGuia: guideNumber,
        fecha: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Actualizar estado del delivery
      const updatedDelivery = {
        ...selectedDelivery,
        estado: "SALIDA_OK" as const,
        exitedBy: "security-user-1",
        exitedAt: new Date(),
        notes: exitNotes || selectedDelivery.notes,
      }

      // Mover de loaded a exited
      setLoadedDeliveries((prev) => prev.filter((d) => d.id !== selectedDelivery.id))
      setExitedDeliveries((prev) => [updatedDelivery, ...prev])

      toast.success("Salida autorizada", {
        description: `Guía de despacho ${guideNumber} generada`,
      })

      console.log("Dispatch guide generated:", dispatchGuide)
      console.log("Exit photo:", exitPhoto)

      // Limpiar y cerrar modal
      setShowExitModal(false)
      setSelectedDelivery(null)
      setExitPhoto(null)
      setExitNotes("")
    } catch (error) {
      toast.error("Error al autorizar salida")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowExitModal(false)
    setSelectedDelivery(null)
    setExitPhoto(null)
    setExitNotes("")
  }

  return (
    <AppLayout title="Control de Salida">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Salida</h2>
          <p className="text-muted-foreground">Autoriza la salida de camiones cargados</p>
        </div>

        {/* Búsqueda rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Búsqueda Rápida
            </CardTitle>
            <CardDescription>Busca por placa, ID de viaje o cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por placa (ABC-12D), ID de viaje o cliente..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Viajes cargados listos para salir */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Viajes Listos para Salir
              <Badge variant="secondary">{filteredDeliveries.length}</Badge>
            </CardTitle>
            <CardDescription>Camiones cargados esperando autorización de salida</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No se encontraron viajes con esa búsqueda" : "No hay viajes listos para salir"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeliveries.map((delivery) => (
                  <Card
                    key={delivery.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10"
                    onClick={() => handleSelectDelivery(delivery)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg">{delivery.truck?.placa}</p>
                          <p className="text-sm text-muted-foreground">ID: {delivery.id}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Listo
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{delivery.order?.client?.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{delivery.productFormat?.product?.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="font-medium">
                            {delivery.cantidadBase} {delivery.productFormat?.unidadBase}
                          </span>
                        </div>
                        {delivery.loadedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cargado:</span>
                            <span>{new Date(delivery.loadedAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>

                      <Button className="w-full mt-3" size="sm">
                        <LogOut className="h-4 w-4 mr-2" />
                        Autorizar Salida
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salidas recientes */}
        {exitedDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Salidas Recientes
                <Badge variant="secondary">{exitedDeliveries.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exitedDeliveries.map((delivery) => (
                  <Card
                    key={delivery.id}
                    className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{delivery.truck?.placa}</p>
                          <p className="text-sm text-muted-foreground">{delivery.order?.client?.nombre}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Salió</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span>
                            {delivery.cantidadBase} {delivery.productFormat?.unidadBase}
                          </span>
                        </div>
                        {delivery.exitedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Salida:</span>
                            <span>{new Date(delivery.exitedAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de autorización de salida */}
        <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-green-600" />
                Autorizar Salida - {selectedDelivery?.truck?.placa}
              </DialogTitle>
              <DialogDescription>
                Verifica la información y toma foto de la placa para autorizar la salida
              </DialogDescription>
            </DialogHeader>

            {selectedDelivery && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium text-sm">{selectedDelivery.order?.client?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Material</p>
                    <p className="font-medium text-sm">{selectedDelivery.productFormat?.product?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cantidad</p>
                    <p className="font-medium text-sm">
                      {selectedDelivery.cantidadBase} {selectedDelivery.productFormat?.unidadBase}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="font-medium text-sm">
                      {selectedDelivery.order?.destination?.nombre || "No especificado"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Foto del patio */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4" />
                      Foto del Patio
                    </h4>
                    {selectedDelivery.loadPhoto ? (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={selectedDelivery.loadPhoto || "/placeholder.svg"}
                          alt="Foto de carga del patio"
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-2 bg-muted text-sm text-muted-foreground text-center">Carga verificada</div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center h-48 flex flex-col items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Sin foto</p>
                      </div>
                    )}
                  </div>

                  {/* Foto de salida */}
                  <div>
                    <PhotoInput
                      onSelect={setExitPhoto}
                      required={true}
                      label="Foto de salida (obligatoria)"
                      capture={true}
                    />
                    <p className="text-sm text-muted-foreground mt-2">Placa visible en la foto</p>
                  </div>
                </div>

                {selectedDelivery.notes && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Notas del Patio:</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">{selectedDelivery.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Observaciones de Seguridad</Label>
                  <Textarea
                    value={exitNotes}
                    onChange={(e) => setExitNotes(e.target.value)}
                    placeholder="Documentos OK, condición del vehículo..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Alertas de validación */}
                {selectedDelivery.estado !== "CARGADA" && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Este viaje no está cargado. Solo se pueden autorizar viajes cargados.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAuthorizeExit}
                    disabled={isSubmitting || !exitPhoto || selectedDelivery.estado !== "CARGADA"}
                    className="flex-1"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Procesando..." : "Salida OK - Generar Guía"}
                  </Button>
                  <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting} size="sm">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
