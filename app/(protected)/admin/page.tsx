"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  UnitBase
} from "@/lib/types"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("productos")
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState<string>("")
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para cada catálogo
  const [products, setProducts] = useState<Product[]>([])
  const [formats, setFormats] = useState<ProductFormat[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [trucks, setTrucks] = useState<TruckType[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        setLoading(true)
        const responses = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/product-formats", { cache: "no-store" }),
          fetch("/api/customers", { cache: "no-store" }),
          fetch("/api/destinations", { cache: "no-store" }),
          fetch("/api/trucks", { cache: "no-store" }),
          fetch("/api/drivers", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
        ])

        for (const res of responses) {
            if (!res.ok) throw new Error(`Failed to fetch: ${res.url}`)
        }

        const [productsData, formatsData, clientsData, destinationsData, trucksData, driversData, usersData] = await Promise.all(responses.map(res => res.json()));

        setProducts(productsData)
        setFormats(formatsData)
        setClients(clientsData)
        setDestinations(destinationsData)
        setTrucks(trucksData)
        setDrivers(driversData)
        setUsers(usersData)

      } catch (e: any) {
        setError(e.message)
        toast.error("Error al cargar catálogos", { description: e.message })
      } finally {
        setLoading(false)
      }
    }
    loadCatalogs()
  }, [])


  // Formularios
  const [productForm, setProductForm] = useState({
    codigo: "",
    nombre: "",
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
    setProductForm({ codigo: "", nombre: ""})
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
        setProductForm({ codigo: item.codigo, nombre: item.nombre})
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
    setIsSubmitting(true);
    
    const type = dialogType;
    const isEditing = !!editingItem;
    const url = isEditing ? `/api/${type}s/${editingItem.id}` : `/api/${type}s`;
    const method = isEditing ? 'PATCH' : 'POST';
    
    let body;
    switch (type) {
        case "producto": body = productForm; break;
        case "formato": body = formatForm; break;
        case "cliente": body = clientForm; break;
        case "destino": body = { ...destinationForm, customer_id: destinationForm.clientId }; break;
        case "camion": body = truckForm; break;
        case "chofer": body = driverForm; break;
        case "usuario": body = { ...userForm, password: "123456" }; break; // Default password for new users
    }

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Error al guardar ${type}`);
        }

        const savedItem = await res.json();
        
        const updateState = (setter: Function) => {
            setter((prev: any[]) => 
                isEditing 
                    ? prev.map((item: any) => item.id === savedItem.id ? savedItem : item) 
                    : [...prev, savedItem]
            );
        };

        switch (type) {
            case "producto": updateState(setProducts); break;
            case "formato": updateState(setFormats); break;
            case "cliente": updateState(setClients); break;
            case "destino": updateState(setDestinations); break;
            case "camion": updateState(setTrucks); break;
            case "chofer": updateState(setDrivers); break;
            case "usuario": updateState(setUsers); break;
        }

        toast.success(`'${type}' guardado exitosamente.`);
        setShowDialog(false);

    } catch (err: any) {
        toast.error(`Error al guardar`, { description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (type: string, item: any) => {
    const isActive = item.isActive ?? item.activo;
    
    // Usamos el confirm nativo para simplicidad, o podrías implementar un diálogo de confirmación más elegante
    if (!confirm(`¿Estás seguro de que quieres ${isActive ? 'desactivar' : 'activar'} este ${type}?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/${type}s/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, is_active: !isActive, activo: !isActive }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Error al actualizar estado`);
        }

        const updatedItem = await res.json();

        const updateState = (setter: Function) => {
            setter((prev: any[]) => prev.map((i: any) => i.id === updatedItem.id ? updatedItem : i));
        };

        switch (type) {
            case "producto": updateState(setProducts); break;
            case "formato": updateState(setFormats); break;
            case "cliente": updateState(setClients); break;
            case "destino": updateState(setDestinations); break;
            case "camion": updateState(setTrucks); break;
            case "chofer": updateState(setDrivers); break;
            case "usuario": updateState(setUsers); break;
        }

        toast.success("Estado actualizado correctamente.");

    } catch (err: any) {
        toast.error("Error al cambiar el estado", { description: err.message });
    }
  };
  
  if (loading) {
    return (
        <AppLayout title="Administración">
            <div className="text-center p-8">Cargando catálogos...</div>
        </AppLayout>
    )
  }

  if (error) {
      return (
        <AppLayout title="Administración">
            <div className="text-center p-8 text-destructive">{error}</div>
        </AppLayout>
      )
  }

  const renderDialog = () => {
    const getTitle = () => {
      const action = editingItem ? "Editar" : "Nuevo"
      switch (dialogType) {
        case "producto": return `${action} Producto`;
        case "formato": return `${action} Formato`;
        case "cliente": return `${action} Cliente`;
        case "destino": return `${action} Destino`;
        case "camion": return `${action} Camión`;
        case "chofer": return `${action} Chofer`;
        case "usuario": return `${action} Usuario`;
        default: return action;
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
                    <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                      onChange={(e) => setFormatForm({ ...formatForm, factorUnidadBase: Number.parseFloat(e.target.value) || 1 })}
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
                      onChange={(e) => setFormatForm({ ...formatForm, pricePerUnit: Number.parseFloat(e.target.value) || 0 })}
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
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                onClick={() => handleToggleStatus("producto", product)}
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
                                  onClick={() => handleToggleStatus("formato", format)}
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
                                onClick={() => handleToggleStatus("cliente", client)}
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
                                  onClick={() => handleToggleStatus("destino", destination)}
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
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("camion", truck)}>
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
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("chofer", driver)}>
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
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus("usuario", user)}>
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