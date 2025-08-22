"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { mockCustomers } from "@/lib/mock-data"
import type { Customer } from "@/lib/types"
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, CheckCircle } from "lucide-react"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    rfc: "",
    address: "",
    phone: "",
    email: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleNewCustomer = () => {
    setEditingCustomer(null)
    setFormData({
      name: "",
      rfc: "",
      address: "",
      phone: "",
      email: "",
    })
    setShowForm(true)
    setSuccess("")
    setError("")
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      rfc: customer.rfc || "",
      address: customer.address || "",
      phone: customer.phone || "",
      email: customer.email || "",
    })
    setShowForm(true)
    setSuccess("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (editingCustomer) {
        // Update existing customer
        const updatedCustomers = customers.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                ...formData,
                updatedAt: new Date(),
              }
            : c,
        )
        setCustomers(updatedCustomers)
        setSuccess("Cliente actualizado exitosamente")
      } else {
        // Create new customer
        const newCustomer: Customer = {
          id: String(Date.now()),
          ...formData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setCustomers([...customers, newCustomer])
        setSuccess("Cliente creado exitosamente")
      }

      setShowForm(false)
      setFormData({
        name: "",
        rfc: "",
        address: "",
        phone: "",
        email: "",
      })
    } catch (err) {
      setError("Error al guardar el cliente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (customer: Customer) => {
    try {
      const updatedCustomers = customers.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              isActive: !c.isActive,
              updatedAt: new Date(),
            }
          : c,
      )
      setCustomers(updatedCustomers)
      setSuccess(`Cliente ${customer.isActive ? "desactivado" : "activado"} exitosamente`)
    } catch (err) {
      setError("Error al cambiar el estado del cliente")
    }
  }

  return (
    <AppLayout title="Gestión de Clientes">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
            <p className="text-muted-foreground">Gestiona el catálogo de clientes</p>
          </div>
          <Button onClick={handleNewCustomer} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuevo Cliente</span>
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Customer Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</CardTitle>
              <CardDescription>
                {editingCustomer ? "Actualiza la información del cliente" : "Completa los datos del nuevo cliente"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre / Razón Social *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del cliente o empresa"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfc">RFC</Label>
                    <Input
                      id="rfc"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                      placeholder="RFC del cliente"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={isSubmitting || !formData.name}>
                    {isSubmitting ? "Guardando..." : editingCustomer ? "Actualizar" : "Crear Cliente"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingCustomer(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, RFC o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No se encontraron clientes</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg truncate">{customer.name}</CardTitle>
                      {customer.rfc && <p className="text-sm text-muted-foreground mt-1">{customer.rfc}</p>}
                    </div>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground line-clamp-2">{customer.address}</p>
                    </div>
                  )}

                  {customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                  )}

                  {customer.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                      className="flex items-center space-x-1 flex-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={customer.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(customer)}
                      className="flex items-center space-x-1"
                    >
                      {customer.isActive ? <Trash2 className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      <span>{customer.isActive ? "Desactivar" : "Activar"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
