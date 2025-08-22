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
import { mockTrucks } from "@/lib/mock-data"
import type { Truck } from "@/lib/types"
import { TruckIcon, Plus, Search, Edit, Trash2, CheckCircle, Phone, User } from "lucide-react"

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>(mockTrucks)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null)
  const [formData, setFormData] = useState({
    plates: "",
    brand: "",
    model: "",
    capacity: 0,
    driverName: "",
    driverPhone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const filteredTrucks = trucks.filter(
    (truck) =>
      truck.plates.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverName?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleNewTruck = () => {
    setEditingTruck(null)
    setFormData({
      plates: "",
      brand: "",
      model: "",
      capacity: 0,
      driverName: "",
      driverPhone: "",
    })
    setShowForm(true)
    setSuccess("")
    setError("")
  }

  const handleEditTruck = (truck: Truck) => {
    setEditingTruck(truck)
    setFormData({
      plates: truck.plates,
      brand: truck.brand || "",
      model: truck.model || "",
      capacity: truck.capacity || 0,
      driverName: truck.driverName || "",
      driverPhone: truck.driverPhone || "",
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

      if (editingTruck) {
        // Update existing truck
        const updatedTrucks = trucks.map((t) =>
          t.id === editingTruck.id
            ? {
                ...t,
                ...formData,
                updatedAt: new Date(),
              }
            : t,
        )
        setTrucks(updatedTrucks)
        setSuccess("Camión actualizado exitosamente")
      } else {
        // Create new truck
        const newTruck: Truck = {
          id: String(Date.now()),
          ...formData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setTrucks([...trucks, newTruck])
        setSuccess("Camión creado exitosamente")
      }

      setShowForm(false)
      setFormData({
        plates: "",
        brand: "",
        model: "",
        capacity: 0,
        driverName: "",
        driverPhone: "",
      })
    } catch (err) {
      setError("Error al guardar el camión")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (truck: Truck) => {
    try {
      const updatedTrucks = trucks.map((t) =>
        t.id === truck.id
          ? {
              ...t,
              isActive: !t.isActive,
              updatedAt: new Date(),
            }
          : t,
      )
      setTrucks(updatedTrucks)
      setSuccess(`Camión ${truck.isActive ? "desactivado" : "activado"} exitosamente`)
    } catch (err) {
      setError("Error al cambiar el estado del camión")
    }
  }

  return (
    <AppLayout title="Gestión de Camiones">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Camiones</h2>
            <p className="text-muted-foreground">Gestiona el catálogo de camiones</p>
          </div>
          <Button onClick={handleNewTruck} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuevo Camión</span>
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

        {/* Truck Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingTruck ? "Editar Camión" : "Nuevo Camión"}</CardTitle>
              <CardDescription>
                {editingTruck ? "Actualiza la información del camión" : "Completa los datos del nuevo camión"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plates">Placas *</Label>
                    <Input
                      id="plates"
                      value={formData.plates}
                      onChange={(e) => setFormData({ ...formData, plates: e.target.value.toUpperCase() })}
                      placeholder="ABC-123-D"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Kenworth, Freightliner, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="T800, Cascadia, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad (m3)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.capacity || ""}
                    onChange={(e) => setFormData({ ...formData, capacity: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="15.0"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driverName">Nombre del Conductor</Label>
                    <Input
                      id="driverName"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      placeholder="Nombre completo del conductor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driverPhone">Teléfono del Conductor</Label>
                    <Input
                      id="driverPhone"
                      value={formData.driverPhone}
                      onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={isSubmitting || !formData.plates}>
                    {isSubmitting ? "Guardando..." : editingTruck ? "Actualizar" : "Crear Camión"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingTruck(null)
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
                placeholder="Buscar por placas, marca, modelo o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Trucks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrucks.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <TruckIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No se encontraron camiones</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredTrucks.map((truck) => (
              <Card key={truck.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{truck.plates}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {truck.brand} {truck.model}
                      </p>
                    </div>
                    <Badge variant={truck.isActive ? "default" : "secondary"}>
                      {truck.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {truck.capacity && (
                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                      <p className="text-lg font-bold text-primary">{truck.capacity} m³</p>
                      <p className="text-sm text-primary/80">Capacidad</p>
                    </div>
                  )}

                  {truck.driverName && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{truck.driverName}</p>
                      </div>
                      {truck.driverPhone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{truck.driverPhone}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTruck(truck)}
                      className="flex items-center space-x-1 flex-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={truck.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(truck)}
                      className="flex items-center space-x-1"
                    >
                      {truck.isActive ? <Trash2 className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      <span>{truck.isActive ? "Desactivar" : "Activar"}</span>
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
