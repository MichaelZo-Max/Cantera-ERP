"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TruckPlateInput } from "@/components/forms/truck-plate-input"
import {
  Settings,
  Package,
  Layers,
  Users,
  Truck,
  UserCheck,
  MapPin,
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import type {
  Product,
  ProductFormat,
  Client,
  Destination,
  Truck as TruckType,
  Driver,
  User,
  UnitBase,
  ProductArea,
} from "@/lib/types"

// Mock data - En producción vendría de la API
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
]

const mockClients: Client[] = [
  {
    id: "1",
    nombre: "Constructora Los Andes",
    rif: "J-12345678-9",
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
]

const mockTrucks: TruckType[] = [
  {
    id: "1",
    placa: "ABC-12D",
    brand: "Volvo",
    model: "FH16",
    capacity: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockDrivers: Driver[] = [
  {
    id: "1",
    nombre: "Juan Pérez",
    docId: "V-12345678",
    phone: "+58-414-1234567",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@cantera.com",
    name: "Administrador",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("productos")
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState<string>("")
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para cada catálogo
  const [products, setProducts] = useState(mockProducts)
  const [formats, setFormats] = useState(mockFormats)
  const [clients, setClients] = useState(mockClients)
  const [destinations, setDestinations] = useState(mockDestinations)
  const [trucks, setTrucks] = useState(mockTrucks)
  const [drivers, setDrivers] = useState(mockDrivers)
  const [users, setUsers] = useState(mockUsers)

  // Formularios
  const [productForm, setProductForm] = useState({
    codigo: "",
    nombre: "",
    area: "AGREGADOS" as ProductArea,
  })

  const [formatForm, setFormatForm] = useState({
    productId: "",
    unidadBase: "M3" as UnitBase,
    factorUnidadBase: 1,
    sku: "",
    pricePerUnit: 0,
  })

  const [clientForm, setClientForm] = useState({
    nombre: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  })

  const [destinationForm, setDestinationForm] = useState({
    clientId: "",
    nombre: "",
    direccion: "",
  })

  const [truckForm, setTruckForm] = useState({
    placa: "",
    brand: "",
    model: "",
    capacity: 0,
  })

  const [driverForm, setDriverForm] = useState({
    nombre: "",
    docId: "",
    phone: "",
  })

  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    role: "CASHIER" as User["role"],
  })

  const handleNew = (type: string) => {
    setDialogType(type)
    setEditingItem(null)
    // Reset forms
    setProductForm({ codigo: "", nombre: "", area: "AGREGADOS" })
    setFormatForm({ productId: "", unidadBase: "M3", factorUnidadBase: 1, sku: "", pricePerUnit: 0 })
    setClientForm({ nombre: "", rif: "", address: "", phone: "", email: "" })
    setDestinationForm({ clientId: "", nombre: "", direccion: "" })
    setTruckForm({ placa: "", brand: "", model: "", capacity: 0 })
    setDriverForm({ nombre: "", docId: "", phone: "" })
    setUserForm({ email: "", name: "", role: "CASHIER" })
    setShowDialog(true)
  }

  const handleEdit = (type: string, item: any) => {
    setDialogType(type)
    setEditingItem(item)

    // Pre-llenar formularios según el tipo
    switch (type) {
      case "producto":
        setProductForm({ codigo: item.codigo, nombre: item.nombre, area: item.area })
        break
      case "formato":
        setFormatForm({
          productId: item.productId,
          unidadBase: item.unidadBase,
          factorUnidadBase: item.factorUnidadBase,
          sku: item.sku || "",
          pricePerUnit: item.pricePerUnit || 0,
        })
        break
      case "cliente":
        setClientForm({
          nombre: item.nombre,
          rif: item.rif || "",
          address: item.address || "",
          phone: item.phone || "",
          email: item.email || "",
        })
        break
      case "destino":
        setDestinationForm({
          clientId: item.clientId,
          nombre: item.nombre,
          direccion: item.direccion || "",
        })
        break
      case "camion":
        setTruckForm({
          placa: item.placa,
          brand: item.brand || "",
          model: item.model || "",
          capacity: item.capacity || 0,
        })
        break
      case "chofer":
        setDriverForm({
          nombre: item.nombre,
          docId: item.docId || "",
          phone: item.phone || "",
        })
        break
      case "usuario":
        setUserForm({
          email: item.email,
          name: item.name,
          role: item.role,
        })
        break
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    setIsSubmitting(true)

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const now = new Date()

      switch (dialogType) {
        case "producto":
          if (editingItem) {
            setProducts((prev) =>
              prev.map((p) => (p.id === editingItem.id ? { ...p, ...productForm, updatedAt: now } : p)),
            )
          } else {
            const newProduct: Product = {
              id: Date.now().toString(),
              ...productForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setProducts((prev) => [...prev, newProduct])
          }
          break

        case "formato":
          if (editingItem) {
            setFormats((prev) =>
              prev.map((f) => (f.id === editingItem.id ? { ...f, ...formatForm, updatedAt: now } : f)),
            )
          } else {
            const newFormat: ProductFormat = {
              id: Date.now().toString(),
              ...formatForm,
              activo: true,
              createdAt: now,
              updatedAt: now,
            }
            setFormats((prev) => [...prev, newFormat])
          }
          break

        case "cliente":
          if (editingItem) {
            setClients((prev) =>
              prev.map((c) => (c.id === editingItem.id ? { ...c, ...clientForm, updatedAt: now } : c)),
            )
          } else {
            const newClient: Client = {
              id: Date.now().toString(),
              ...clientForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setClients((prev) => [...prev, newClient])
          }
          break

        case "destino":
          if (editingItem) {
            setDestinations((prev) =>
              prev.map((d) => (d.id === editingItem.id ? { ...d, ...destinationForm, updatedAt: now } : d)),
            )
          } else {
            const newDestination: Destination = {
              id: Date.now().toString(),
              ...destinationForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setDestinations((prev) => [...prev, newDestination])
          }
          break

        case "camion":
          if (editingItem) {
            setTrucks((prev) => prev.map((t) => (t.id === editingItem.id ? { ...t, ...truckForm, updatedAt: now } : t)))
          } else {
            const newTruck: TruckType = {
              id: Date.now().toString(),
              ...truckForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setTrucks((prev) => [...prev, newTruck])
          }
          break

        case "chofer":
          if (editingItem) {
            setDrivers((prev) =>
              prev.map((d) => (d.id === editingItem.id ? { ...d, ...driverForm, updatedAt: now } : d)),
            )
          } else {
            const newDriver: Driver = {
              id: Date.now().toString(),
              ...driverForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setDrivers((prev) => [...prev, newDriver])
          }
          break

        case "usuario":
          if (editingItem) {
            setUsers((prev) => prev.map((u) => (u.id === editingItem.id ? { ...u, ...userForm, updatedAt: now } : u)))
          } else {
            const newUser: User = {
              id: Date.now().toString(),
              ...userForm,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }
            setUsers((prev) => [...prev, newUser])
          }
          break
      }

      toast.success(editingItem ? "Actualizado exitosamente" : "Creado exitosamente")
      setShowDialog(false)
    } catch (error) {
      toast.error("Error al guardar")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = (type: string, id: string) => {
    const now = new Date()

    switch (type) {
      case "producto":
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive, updatedAt: now } : p)))
        break
      case "formato":
        setFormats((prev) => prev.map((f) => (f.id === id ? { ...f, activo: !f.activo, updatedAt: now } : f)))
        break
      case "cliente":
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive, updatedAt: now } : c)))
        break
      case "destino":
        setDestinations((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive, updatedAt: now } : d)))
        break
      case "camion":
        setTrucks((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive, updatedAt: now } : t)))
        break
      case "chofer":
        setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive, updatedAt: now } : d)))
        break
      case "usuario":
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive, updatedAt: now } : u)))
        break
    }

    toast.success("Estado actualizado")
  }

  const renderDialog = () => {
    const getTitle = () => {
      const action = editingItem ? "Editar" : "Nuevo"
      switch (dialogType) {
        case "producto":
          return `${action} Producto`
        case "formato":
          return `${action} Formato`
        case "cliente":
          return `${action} Cliente`
        case "destino":
          return `${action} Destino`
        case "camion":
          return `${action} Camión`
        case "chofer":
          return `${action} Chofer`
        case "usuario":
          return `${action} Usuario`
        default:
          return action
      }
    }

    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Actualiza la información" : "Completa los datos requeridos"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogType === "producto" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input
                      value={productForm.codigo}
                      onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
                      placeholder="AGR001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Área *</Label>
                    <Select
                      value={productForm.area}
                      onValueChange={(value: ProductArea) => setProductForm({ ...productForm, area: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGREGADOS">Agregados</SelectItem>
                        <SelectItem value="ASFALTOS">Asfaltos</SelectItem>
                        <SelectItem value="VIVEROS">Viveros</SelectItem>
                        <SelectItem value="SERVICIOS">Servicios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={productForm.nombre}
                    onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                    placeholder="Nombre del producto"
                  />
                </div>
              </>
            )}

            {dialogType === "formato" && (
              <>
                <div className="space-y-2">
                  <Label>Producto *</Label>
                  <Select
                    value={formatForm.productId}
                    onValueChange={(value) => setFormatForm({ ...formatForm, productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.nombre} ({product.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidad Base *</Label>
                    <Select
                      value={formatForm.unidadBase}
                      onValueChange={(value: UnitBase) => setFormatForm({ ...formatForm, unidadBase: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M3">m³</SelectItem>
                        <SelectItem value="TON">toneladas</SelectItem>
                        <SelectItem value="BOLSA">bolsas</SelectItem>
                        <SelectItem value="UNIDAD">unidades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Factor de Conversión *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formatForm.factorUnidadBase}
                      onChange={(e) =>
                        setFormatForm({ ...formatForm, factorUnidadBase: Number.parseFloat(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={formatForm.sku}
                      onChange={(e) => setFormatForm({ ...formatForm, sku: e.target.value })}
                      placeholder="A granel (m³)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio por Unidad</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatForm.pricePerUnit}
                      onChange={(e) =>
                        setFormatForm({ ...formatForm, pricePerUnit: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {dialogType === "cliente" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={clientForm.nombre}
                      onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RIF</Label>
                    <Input
                      value={clientForm.rif}
                      onChange={(e) => setClientForm({ ...clientForm, rif: e.target.value })}
                      placeholder="J-12345678-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Textarea
                    value={clientForm.address}
                    onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                    placeholder="Dirección del cliente"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      placeholder="+58-414-1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      placeholder="cliente@empresa.com"
                    />
                  </div>
                </div>
              </>
            )}

            {dialogType === "destino" && (
              <>
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={destinationForm.clientId}
                    onValueChange={(value) => setDestinationForm({ ...destinationForm, clientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Destino *</Label>
                  <Input
                    value={destinationForm.nombre}
                    onChange={(e) => setDestinationForm({ ...destinationForm, nombre: e.target.value })}
                    placeholder="Obra Av. Norte"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Textarea
                    value={destinationForm.direccion}
                    onChange={(e) => setDestinationForm({ ...destinationForm, direccion: e.target.value })}
                    placeholder="Dirección específica del destino"
                    rows={2}
                  />
                </div>
              </>
            )}

            {dialogType === "camion" && (
              <>
                <div className="space-y-2">
                  <TruckPlateInput
                    value={truckForm.placa}
                    onChange={(value) => setTruckForm({ ...truckForm, placa: value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input
                      value={truckForm.brand}
                      onChange={(e) => setTruckForm({ ...truckForm, brand: e.target.value })}
                      placeholder="Volvo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      value={truckForm.model}
                      onChange={(e) => setTruckForm({ ...truckForm, model: e.target.value })}
                      placeholder="FH16"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capacidad (m³)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={truckForm.capacity}
                    onChange={(e) => setTruckForm({ ...truckForm, capacity: Number.parseInt(e.target.value) || 0 })}
                    placeholder="25"
                  />
                </div>
              </>
            )}

            {dialogType === "chofer" && (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={driverForm.nombre}
                    onChange={(e) => setDriverForm({ ...driverForm, nombre: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Documento de Identidad</Label>
                    <Input
                      value={driverForm.docId}
                      onChange={(e) => setDriverForm({ ...driverForm, docId: e.target.value })}
                      placeholder="V-12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      placeholder="+58-414-1234567"
                    />
                  </div>
                </div>
              </>
            )}

            {dialogType === "usuario" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="usuario@cantera.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: User["role"]) => setUserForm({ ...userForm, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">Cajero</SelectItem>
                      <SelectItem value="YARD">Patio</SelectItem>
                      <SelectItem value="SECURITY">Vigilancia</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="REPORTS">Reportes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSubmitting} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <AppLayout title="Administración">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Administración de Catálogos
          </h2>
          <p className="text-muted-foreground">Gestiona todos los catálogos del sistema</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="productos" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Productos</span>
            </TabsTrigger>
            <TabsTrigger value="formatos" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Formatos</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="destinos" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Destinos</span>
            </TabsTrigger>
            <TabsTrigger value="camiones" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Camiones</span>
            </TabsTrigger>
            <TabsTrigger value="choferes" className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Choferes</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
          </TabsList>

          {/* Búsqueda y botón nuevo */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleNew(activeTab.slice(0, -1))}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>

          <TabsContent value="productos">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Gestiona el catálogo de productos</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .filter(
                        (p) =>
                          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codigo.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.codigo}</TableCell>
                          <TableCell>{product.nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.area}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                              {product.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit("producto", product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus("producto", product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formatos">
            <Card>
              <CardHeader>
                <CardTitle>Formatos de Productos</CardTitle>
                <CardDescription>Gestiona los formatos y unidades base</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Unidad Base</TableHead>
                      <TableHead>Factor</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formats
                      .filter(
                        (f) =>
                          f.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          products
                            .find((p) => p.id === f.productId)
                            ?.nombre.toLowerCase()
                            .includes(searchTerm.toLowerCase()),
                      )
                      .map((format) => {
                        const product = products.find((p) => p.id === format.productId)
                        return (
                          <TableRow key={format.id}>
                            <TableCell>{product?.nombre || "N/A"}</TableCell>
                            <TableCell>{format.sku || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{format.unidadBase}</Badge>
                            </TableCell>
                            <TableCell>{format.factorUnidadBase}</TableCell>
                            <TableCell>${format.pricePerUnit?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell>
                              <Badge variant={format.activo ? "default" : "secondary"}>
                                {format.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit("formato", format)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus("formato", format.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes">
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Gestiona la información de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>RIF</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients
                      .filter(
                        (c) =>
                          c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.rif?.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.nombre}</TableCell>
                          <TableCell>{client.rif || "N/A"}</TableCell>
                          <TableCell>{client.phone || "N/A"}</TableCell>
                          <TableCell>{client.email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={client.isActive ? "default" : "secondary"}>
                              {client.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit("cliente", client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus("cliente", client.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="destinos">
            <Card>
              <CardHeader>
                <CardTitle>Destinos</CardTitle>
                <CardDescription>Gestiona los destinos de entrega</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinations
                      .filter(
                        (d) =>
                          d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          clients
                            .find((c) => c.id === d.clientId)
                            ?.nombre.toLowerCase()
                            .includes(searchTerm.toLowerCase()),
                      )
                      .map((destination) => {
                        const client = clients.find((c) => c.id === destination.clientId)
                        return (
                          <TableRow key={destination.id}>
                            <TableCell>{client?.nombre || "N/A"}</TableCell>
                            <TableCell className="font-medium">{destination.nombre}</TableCell>
                            <TableCell>{destination.direccion || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={destination.isActive ? "default" : "secondary"}>
                                {destination.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit("destino", destination)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus("destino", destination.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="camiones">
            <Card>
              <CardHeader>
                <CardTitle>Camiones</CardTitle>
                <CardDescription>Gestiona la flota de camiones</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Capacidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trucks
                      .filter(
                        (t) =>
                          t.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.brand?.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((truck) => (
                        <TableRow key={truck.id}>
                          <TableCell className="font-medium">{truck.placa}</TableCell>
                          <TableCell>{truck.brand || "N/A"}</TableCell>
                          <TableCell>{truck.model || "N/A"}</TableCell>
                          <TableCell>{truck.capacity ? `${truck.capacity} m³` : "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={truck.isActive ? "default" : "secondary"}>
                              {truck.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit("camion", truck)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("camion", truck.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="choferes">
            <Card>
              <CardHeader>
                <CardTitle>Choferes</CardTitle>
                <CardDescription>Gestiona la información de conductores</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers
                      .filter(
                        (d) =>
                          d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.docId?.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.nombre}</TableCell>
                          <TableCell>{driver.docId || "N/A"}</TableCell>
                          <TableCell>{driver.phone || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={driver.isActive ? "default" : "secondary"}>
                              {driver.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit("chofer", driver)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("chofer", driver.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuarios del Sistema</CardTitle>
                <CardDescription>Gestiona los usuarios y sus roles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(
                        (u) =>
                          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit("usuario", user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("usuario", user.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {renderDialog()}
      </div>
    </AppLayout>
  )
}
