// app/(protected)/admin/trucks/trucks-client.tsx
"use client";

import type React from "react";
// 1. Importar `useCallback` y `useMemo`
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Truck as TruckType, Driver } from "@/lib/types";
import {
  TruckIcon,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";

// El componente ahora recibe los datos iniciales como props
export function TrucksClientUI({
  initialTrucks,
  initialDrivers,
}: {
  initialTrucks: TruckType[];
  initialDrivers: Driver[];
}) {
  // Los estados para manejar la data ahora se inicializan con las props
  const [trucks, setTrucks] = useState<TruckType[]>(initialTrucks);
  const [drivers] = useState<Driver[]>(initialDrivers);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [formData, setFormData] = useState({
    placa: "",
    brand: "",
    model: "",
    capacity: 0,
    driverId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

  // 2. Memorizar el resultado del filtro
  const filteredTrucks = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          truck.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (truck.brand &&
            truck.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (truck.model &&
            truck.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (truck.driver?.name &&
            truck.driver.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [trucks, searchTerm]
  );

  // 3. Envolver las funciones en `useCallback`
  const handleNewTruck = useCallback(() => {
    setEditingTruck(null);
    setFormData({
      placa: "",
      brand: "",
      model: "",
      capacity: 0,
      driverId: "",
    });
    setApiError(null);
    setShowDialog(true);
  }, []);

  const handleEditTruck = useCallback((truck: TruckType) => {
    setEditingTruck(truck);
    setFormData({
      placa: truck.placa,
      brand: truck.brand || "",
      model: truck.model || "",
      capacity: truck.capacity || 0,
      driverId: truck.driverId || "",
    });
    setApiError(null);
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setApiError(null);

      const method = editingTruck ? "PATCH" : "POST";
      const url = editingTruck
        ? `/api/trucks/${editingTruck.id}`
        : "/api/trucks";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Error al guardar el camión");
        }

        const savedTruck = await res.json();

        if (editingTruck) {
          setTrucks((prevTrucks) =>
            prevTrucks.map((t) => (t.id === savedTruck.id ? savedTruck : t))
          );
          toast.success("Camión actualizado exitosamente.");
        } else {
          setTrucks((prevTrucks) => [...prevTrucks, savedTruck]);
          toast.success("Camión creado exitosamente.");
        }

        setShowDialog(false);
      } catch (err: any) {
        setApiError(err.message);
        toast.error("Error al guardar", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingTruck, formData]
  );

  const handleToggleStatus = useCallback(
    (truck: TruckType) => {
      const is_active = truck.is_active;
      confirm(
        {
          title: `¿Estás seguro?`,
          description: `Esta acción ${
            is_active ? "desactivará" : "activará"
          } el camión con placas "${truck.placa}".`,
          confirmText: is_active ? "Desactivar" : "Activar",
          variant: is_active ? "destructive" : "default",
        },
        async () => {
          try {
            const res = await fetch(`/api/trucks/${truck.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !is_active }),
            });
            if (!res.ok) throw new Error(await res.text());
            const updatedTruck = await res.json();
            setTrucks((prevTrucks) =>
              prevTrucks.map((t) =>
                t.id === updatedTruck.id ? updatedTruck : t
              )
            );
            toast.success(
              `Camión ${!is_active ? "activado" : "desactivado"} exitosamente.`
            );
          } catch (err: any) {
            toast.error("Error al cambiar el estado", {
              description: err.message,
            });
          }
        }
      );
    },
    [confirm]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleCancel}
        title={options?.title || ""}
        description={options?.description || ""}
        onConfirm={handleConfirm}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
      />
      {/* Header con el botón para abrir el modal */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Flota de Camiones
              </h2>
              <p className="text-muted-foreground">
                Administra los vehículos de transporte y sus choferes
              </p>
            </div>
          </div>
        </div>
        <GradientButton
          onClick={handleNewTruck}
          className="flex items-center space-x-2 animate-pulse-glow"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Camión</span>
        </GradientButton>
      </div>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por placas, marca, modelo o chofer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Trucks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrucks.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<TruckIcon className="h-12 w-12" />}
                  title="No hay camiones registrados"
                  description="Comienza a gestionar tu flota añadiendo el primer camión."
                  action={
                    <GradientButton
                      onClick={handleNewTruck}
                      className="flex items-center space-x-2 mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Añadir Primer Camión</span>
                    </GradientButton>
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredTrucks.map((truck, index) => (
            <AnimatedCard
              key={truck.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      {truck.placa}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {truck.brand} {truck.model}
                    </p>
                  </div>
                  <Badge
                    variant={truck.is_active ? "default" : "secondary"}
                    className={truck.is_active ? "bg-gradient-primary" : ""}
                  >
                    {truck.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  {truck.capacity && (
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-3 rounded-xl flex-1">
                      <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {truck.capacity} m³
                      </p>
                      <p className="text-sm text-primary/80 font-medium">
                        Capacidad
                      </p>
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/20 p-3 rounded-xl flex-1 ml-2">
                    <p className="text-lg font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent truncate">
                      {truck.driver?.name || "Sin chofer"}
                    </p>
                    <p className="text-sm text-secondary/80 font-medium">
                      Chofer
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTruck(truck)}
                    className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant={truck.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(truck)}
                    className="flex items-center space-x-1 transition-smooth"
                  >
                    {truck.is_active ? (
                      <Trash2 className="h-3 w-3" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>{truck.is_active ? "Desactivar" : "Activar"}</span>
                  </Button>
                </div>
              </CardContent>
            </AnimatedCard>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-primary" />
              {editingTruck ? "Editar Camión" : "Nuevo Camión"}
            </DialogTitle>
            <DialogDescription>
              {editingTruck
                ? "Actualiza la información del vehículo."
                : "Completa los datos del nuevo vehículo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="placa" className="font-semibold">
                Placas *
              </Label>
              <Input
                id="placa"
                value={formData.placa}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    placa: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ABC-123-D"
                required
                className="focus-ring"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand" className="font-semibold">
                  Marca
                </Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="Ej: Kenworth"
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model" className="font-semibold">
                  Modelo
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="Ej: T800"
                  className="focus-ring"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity" className="font-semibold">
                  Capacidad (m³)
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.capacity || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="15.0"
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverId" className="font-semibold">
                  Chofer Asignado
                </Label>
                <Select
                  value={formData.driverId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, driverId: value })
                  }
                >
                  <SelectTrigger className="focus-ring">
                    <SelectValue placeholder="Seleccionar chofer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={String(driver.id)}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <GradientButton
                type="submit"
                disabled={isSubmitting || !formData.placa}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTruck ? "Guardar Cambios" : "Crear Camión"}
                  </>
                )}
              </GradientButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
