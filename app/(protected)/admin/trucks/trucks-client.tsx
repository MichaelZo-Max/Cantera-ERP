"use client";

import type React from "react";
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
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Truck as TruckType } from "@/lib/types";
import {
  TruckIcon,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Plus,
  AlertCircle, // ✨ 1. Importar icono de alerta
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";
import { truckSchema } from "@/lib/validations"; // ✨ 2. Importar el esquema
import { cn } from "@/lib/utils";

// ✨ 3. Definir tipo para errores de formulario (usando nombres correctos)
type FormErrors = {
  placa?: string[];
  brand?: string[];
  model?: string[];
  capacity?: string[];
  _errors?: string[];
};

export function TrucksClientUI({
  initialTrucks,
}: {
  initialTrucks: TruckType[];
}) {
  const [trucks, setTrucks] = useState<TruckType[]>(initialTrucks);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);

  // ✨ 4. Usar los nombres de campo correctos en el status inicial
  const [formData, setFormData] = useState({
    placa: "",
    brand: "",
    model: "",
    capacity: "" as string | number, // El input de número devuelve string
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({}); // ✨ 5. Estado para errores
  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

  const filteredTrucks = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          // Corregido: usar 'placa'
          truck.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (truck.brand &&
            truck.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (truck.model &&
            truck.model.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [trucks, searchTerm]
  );

  const handleNewTruck = useCallback(() => {
    setEditingTruck(null);
    setFormData({
      placa: "",
      brand: "",
      model: "",
      capacity: "",
    });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleEditTruck = useCallback((truck: TruckType) => {
    setEditingTruck(truck);
    setFormData({
      // Corregido: usar 'placa'
      placa: truck.placa,
      brand: truck.brand || "",
      model: truck.model || "",
      capacity: truck.capacity || "",
    });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setFormErrors({});

      // ✨ 6. Validar con Zod en el frontend
      const validation = truckSchema.safeParse(formData);

      if (!validation.success) {
        const zodErrors = validation.error.flatten().fieldErrors;
        setFormErrors(zodErrors as FormErrors);
        setIsSubmitting(false);
        toast.error("Error de validación", {
          description: "Por favor, corrige los campos marcados.",
        });
        return;
      }

      const body = validation.data; // Usar datos validados
      const method = editingTruck ? "PATCH" : "POST";
      const url = editingTruck
        ? `/api/trucks/${editingTruck.id}`
        : "/api/trucks";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const responseData = await res.json();

        if (!res.ok) {
          if (res.status === 400 || res.status === 409) {
            setFormErrors(responseData);
          }
          throw new Error(
            responseData._errors?.[0] || "Error al guardar el camión"
          );
        }

        // Refrescar lista de camiones para mantener la UI sincronizada
        const fetchResponse = await fetch("/api/trucks");
        const updatedTrucks = await fetchResponse.json();
        setTrucks(updatedTrucks);

        toast.success(
          `Camión ${editingTruck ? "actualizado" : "creado"} exitosamente.`
        );
        setShowDialog(false);
      } catch (err: any) {
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
          } el camión con placas "${truck.placa}".`, // Corregido: usar 'placa'
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
            setTrucks((prev) =>
              prev.map((t) => (t.id === updatedTruck.id ? updatedTruck : t))
            );

            toast.success(
              `Camión ${!is_active ? "activado" : "desactivado"} exitosamente.`
            );
          } catch (err: any) {
            toast.error("Error al cambiar el status", {
              description: err.message,
            });
          }
        }
      );
    },
    [confirm]
  );

  // (El resto del JSX se mantiene igual que en tu código original)
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
                Administra los vehículos de transporte
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

      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por placas, marca o modelo..."
              value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

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
                      <span>Añadir Primer Camion</span>
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
                : "Completa los datos del nuevo vehiculo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* --- CAMPO PLACA --- */}
            <div className="space-y-2">
              <Label htmlFor="placa" className="font-semibold">
                Placa <span className="text-red-500">*</span>
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
                placeholder="ABC-123"
                className={cn(
                  formErrors.placa && "border-red-500",
                  "focus-ring"
                )}
              />
              {formErrors.placa && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.placa[0]}
                </p>
              )}
            </div>

            {/* --- CAMPOS MARCA Y MODELO --- */}
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
                  className={cn(
                    formErrors.brand && "border-red-500",
                    "focus-ring"
                  )}
                />
                {formErrors.brand && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.brand[0]}
                  </p>
                )}
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
                  className={cn(
                    formErrors.model && "border-red-500",
                    "focus-ring"
                  )}
                />
                {formErrors.model && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.model[0]}
                  </p>
                )}
              </div>
            </div>

            {/* --- CAMPO CAPACIDAD --- */}
            <div className="space-y-2">
              <Label htmlFor="capacity" className="font-semibold">
                Capacidad (m³)
              </Label>
              <Input
                id="capacity"
                type="number"
                step="0.01"
                min="0"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                placeholder="15.0"
                className={cn(
                  formErrors.capacity && "border-red-500",
                  "focus-ring"
                )}
              />
              {formErrors.capacity && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.capacity[0]}
                </p>
              )}
            </div>

            {/* --- ERROR GENERAL --- */}
            {formErrors._errors && (
              <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {formErrors._errors[0]}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <GradientButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                    Gurdando...
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
