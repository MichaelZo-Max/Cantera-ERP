"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Truck as TruckType } from "@/lib/types"
import { TruckIcon, Plus, Search, Edit, Trash2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<TruckType[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null)
  const [formData, setFormData] = useState({
    placa: "",
    brand: "",
    model: "",
    capacity: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    const loadTrucks = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/trucks", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        setTrucks(await res.json());
      } catch (e: any) {
        setApiError(e?.message ?? "Error al cargar los camiones");
        toast.error("Error al cargar camiones", { description: e.message });
      } finally {
        setLoading(false);
      }
    };
    loadTrucks();
  }, []);

  const filteredTrucks = trucks.filter(
    (truck) =>
      truck.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleNewTruck = () => {
    setEditingTruck(null)
    setFormData({
      placa: "",
      brand: "",
      model: "",
      capacity: 0,
    })
    setShowForm(true)
    setApiError("")
  }

  const handleEditTruck = (truck: TruckType) => {
    setEditingTruck(truck)
    setFormData({
      placa: truck.placa,
      brand: truck.brand || "",
      model: truck.model || "",
      capacity: truck.capacity || 0,
    })
    setShowForm(true)
    setApiError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setApiError("")

    const method = editingTruck ? 'PATCH' : 'POST';
    const url = editingTruck ? `/api/trucks/${editingTruck.id}` : '/api/trucks';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok){
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el camión");
      }
      
      const savedTruck = await res.json();
      
      if (editingTruck) {
        setTrucks(trucks.map(t => t.id === savedTruck.id ? savedTruck : t));
        toast.success("Camión actualizado exitosamente.");
      } else {
        setTrucks([...trucks, savedTruck]);
        toast.success("Camión creado exitosamente.");
      }

      setShowForm(false);
    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleStatus = async (truck: TruckType) => {
    const isActive = truck.isActive;
    if (!confirm(`¿Estás seguro de que quieres ${isActive ? "desactivar" : "activar"} este camión?`)) {
        return;
    }

    const originalTrucks = [...trucks];

    try {
        const res = await fetch(`/api/trucks/${truck.id}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...truck, is_active: !isActive }),
        });
        if(!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText);
        }

        const updatedTruck = await res.json();
        setTrucks(trucks.map(t => t.id === updatedTruck.id ? updatedTruck : t));
        toast.success(`Camión ${updatedTruck.isActive ? "activado" : "desactivado"} exitosamente.`);
    } catch (err: any) {
        setTrucks(originalTrucks);
        setApiError(err.message || "Error al cambiar el estado del camión.");
        toast.error("Error al cambiar el estado", { description: err.message });
    }
  }
  
  if (loading) {
    return (
      <AppLayout title="Gestión de Camiones">
        <div className="p-6 text-center">Cargando camiones...</div>
      </AppLayout>
    );
  }

  if (apiError && !showForm) {
    return (
      <AppLayout title="Gestión de Camiones">
        <div className="p-6 text-destructive text-center">Error: {apiError}</div>
      </AppLayout>
    );
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
        
        {apiError && showForm && (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

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
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
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
                  <Label htmlFor="capacity">Capacidad (m³)</Label>
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

                <div className="flex space-x-3">
                  <Button type="submit" disabled={isSubmitting || !formData.placa}>
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

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por placas, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

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
                      <CardTitle className="text-lg">{truck.placa}</CardTitle>
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