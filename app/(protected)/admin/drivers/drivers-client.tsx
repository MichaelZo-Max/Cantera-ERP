// app/(protected)/admin/drivers/drivers-client.tsx
"use client";

import type React from "react";
// 1. Importar `useCallback` y `useMemo` de React.
import { useState, useCallback, useMemo } from "react";
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
import type { Driver } from "@/lib/types";
import {
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";

// El componente recibe los datos iniciales como props
export function DriversClientUI({
  initialDrivers,
}: {
  initialDrivers: Driver[];
}) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    docId: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

  // useMemo para evitar recalcular el filtro en cada render si `drivers` o `searchTerm` no cambian.
  const filteredDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (driver.docId &&
            driver.docId.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [drivers, searchTerm]
  );

  // 2. Envolver las funciones en `useCallback`
  const handleNewDriver = useCallback(() => {
    setEditingDriver(null);
    setFormData({ name: "", docId: "", phone: "" });
    setApiError(null);
    setShowDialog(true);
  }, []); // Dependencias vacías porque no usa props o estado que cambien.

  const handleEditDriver = useCallback((driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      docId: driver.docId || "",
      phone: driver.phone || "",
    });
    setApiError(null);
    setShowDialog(true);
  }, []); // Dependencias vacías por la misma razón.

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setApiError(null);

      const method = editingDriver ? "PATCH" : "POST";
      const url = editingDriver
        ? `/api/drivers/${editingDriver.id}`
        : "/api/drivers";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Error al guardar el chofer");
        }

        const savedDriver = await res.json();

        if (editingDriver) {
          setDrivers((prevDrivers) =>
            prevDrivers.map((d) => (d.id === savedDriver.id ? savedDriver : d))
          );
          toast.success("Chofer actualizado exitosamente.");
        } else {
          setDrivers((prev) => [...prev, savedDriver]);
          toast.success("Chofer creado exitosamente.");
        }

        setShowDialog(false);
      } catch (err: any) {
        setApiError(err.message);
        toast.error("Error al guardar", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingDriver, formData]
  ); // Depende de `editingDriver` y `formData`.

  const handleToggleStatus = useCallback(
    (driver: Driver) => {
      const is_active = driver.is_active;
      confirm(
        {
          title: `¿Estás seguro?`,
          description: `Esta acción ${
            is_active ? "desactivará" : "activará"
          } al chofer "${driver.name}".`,
          confirmText: is_active ? "Desactivar" : "Activar",
          variant: is_active ? "destructive" : "default",
        },
        async () => {
          try {
            const res = await fetch(`/api/drivers/${driver.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !is_active }),
            });

            if (!res.ok) throw new Error(await res.text());

            const updatedDriver = await res.json();
            setDrivers((prevDrivers) =>
              prevDrivers.map((d) =>
                d.id === updatedDriver.id ? updatedDriver : d
              )
            );
            toast.success(
              `Chofer ${!is_active ? "activado" : "desactivado"} exitosamente.`
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
  ); // Depende de `confirm` del hook.

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Choferes
              </h2>
              <p className="text-muted-foreground">
                Administra el personal de conducción
              </p>
            </div>
          </div>
        </div>
        <GradientButton
          onClick={handleNewDriver}
          className="flex items-center space-x-2 animate-pulse-glow"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Chofer</span>
        </GradientButton>
      </div>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por name o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<UserCheck className="h-12 w-12" />}
                  title="No hay choferes registrados"
                  description="Añade tu primer chofer para asignarlo a los camiones de la flota."
                  action={
                    <GradientButton
                      onClick={handleNewDriver}
                      className="flex items-center space-x-2 mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Añadir Primer Chofer</span>
                    </GradientButton>
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredDrivers.map((driver, index) => (
            <AnimatedCard
              key={driver.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      {driver.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {driver.docId || "Sin documento"}
                    </p>
                  </div>
                  <Badge
                    variant={driver.is_active ? "default" : "secondary"}
                    className={driver.is_active ? "bg-gradient-primary" : ""}
                  >
                    {driver.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {driver.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{driver.phone}</span>
                  </div>
                )}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDriver(driver)}
                    className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant={driver.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(driver)}
                    className="flex items-center space-x-1 transition-smooth"
                  >
                    {driver.is_active ? (
                      <Trash2 className="h-3 w-3" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>{driver.is_active ? "Desactivar" : "Activar"}</span>
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
              <UserCheck className="h-5 w-5 text-primary" />
              {editingDriver ? "Editar Chofer" : "Nuevo Chofer"}
            </DialogTitle>
            <DialogDescription>
              {editingDriver
                ? "Actualiza la información del chofer."
                : "Completa los datos del nuevo chofer."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Nombre Completo *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Juan Pérez"
                required
                className="focus-ring"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docId" className="font-semibold">
                  Documento de Identidad
                </Label>
                <Input
                  id="docId"
                  value={formData.docId}
                  onChange={(e) =>
                    setFormData({ ...formData, docId: e.target.value })
                  }
                  placeholder="Ej: V-12345678"
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-semibold">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Ej: 0414-1234567"
                  className="focus-ring"
                />
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
                disabled={isSubmitting || !formData.name}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingDriver ? "Guardar Cambios" : "Crear Chofer"}
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
