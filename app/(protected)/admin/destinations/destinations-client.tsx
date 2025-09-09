// app/(protected)/admin/destinations/destinations-client.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Destination, Client } from "@/lib/types";
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";

export function DestinationsClientUI({
  initialDestinations,
  initialClients,
}: {
  initialDestinations: Destination[];
  initialClients: Client[];
}) {
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [clients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    clientId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const filteredDestinations = destinations.filter(
    (destination) =>
      destination.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (destination.direccion &&
        destination.direccion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (destination.client?.nombre &&
        destination.client.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNewDestination = () => {
    setEditingDestination(null);
    setFormData({ nombre: "", direccion: "", clientId: "" });
    setApiError(null);
    setShowDialog(true);
  };

  const handleEditDestination = (destination: Destination) => {
    setEditingDestination(destination);
    setFormData({
      nombre: destination.nombre,
      direccion: destination.direccion || "",
      clientId: destination.clientId || "",
    });
    setApiError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    const method = editingDestination ? "PATCH" : "POST";
    const url = editingDestination
      ? `/api/destinations/${editingDestination.id}`
      : "/api/destinations";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el destino");
      }

      const savedDestination = await res.json();

      if (editingDestination) {
        setDestinations(
          destinations.map((d) => (d.id === savedDestination.id ? savedDestination : d))
        );
        toast.success("Destino actualizado exitosamente.");
      } else {
        setDestinations((prev) => [...prev, savedDestination]);
        toast.success("Destino creado exitosamente.");
      }

      setShowDialog(false);
    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (destination: Destination) => {
    const is_active = destination.is_active;
    confirm({
        title: `¿Estás seguro?`,
        description: `Esta acción ${
          is_active ? "desactivará" : "activará"
        } el destino "${destination.nombre}".`,
        confirmText: is_active ? "Desactivar" : "Activar",
        variant: is_active ? "destructive" : "default",
      },
      async () => {
        try {
          const res = await fetch(`/api/destinations/${destination.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !is_active }),
          });

          if (!res.ok) throw new Error(await res.text());
          const updatedDestination = await res.json();
          setDestinations(
            destinations.map((d) =>
              d.id === updatedDestination.id ? updatedDestination : d
            )
          );
          toast.success(
            `Destino ${!is_active ? "activado" : "desactivado"} exitosamente.`
          );
        } catch (err: any) {
          toast.error("Error al cambiar el estado", {
            description: err.message,
          });
        }
      }
    );
  };

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
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Destinos
                </h2>
                <p className="text-muted-foreground">
                  Administra las ubicaciones de entrega de los clientes
                </p>
              </div>
            </div>
          </div>
          <GradientButton
            onClick={handleNewDestination}
            className="flex items-center space-x-2 animate-pulse-glow"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Destino</span>
          </GradientButton>
        </div>

        {/* Search Bar */}
        <AnimatedCard hoverEffect="lift" className="glass">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por nombre, dirección o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg focus-ring"
              />
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.length === 0 ? (
            <div className="col-span-full">
              <Card className="glass">
                <CardContent className="pt-6">
                  <EmptyState
                    icon={<MapPin className="h-12 w-12" />}
                    title="No hay destinos registrados"
                    description="Añade un nuevo destino para asignarlo a las órdenes de los clientes."
                    action={
                      <GradientButton
                        onClick={handleNewDestination}
                        className="flex items-center space-x-2 mt-4"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Añadir Primer Destino</span>
                      </GradientButton>
                    }
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredDestinations.map((destination, index) => (
              <AnimatedCard
                key={destination.id}
                hoverEffect="lift"
                animateIn
                delay={index * 100}
                className="glass overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-primary font-semibold">
                        {destination.client?.nombre || "Cliente no asignado"}
                      </p>
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {destination.nombre}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={destination.is_active ? "default" : "secondary"}
                      className={
                        destination.is_active ? "bg-gradient-primary" : ""
                      }
                    >
                      {destination.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {destination.direccion || "Sin dirección especificada"}
                  </p>
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDestination(destination)}
                      className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={destination.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(destination)}
                      className="flex items-center space-x-1 transition-smooth"
                    >
                      {destination.is_active ? (
                        <Trash2 className="h-3 w-3" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      <span>
                        {destination.is_active ? "Desactivar" : "Activar"}
                      </span>
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
                <MapPin className="h-5 w-5 text-primary" />
                {editingDestination ? "Editar Destino" : "Nuevo Destino"}
              </DialogTitle>
              <DialogDescription>
                {editingDestination
                  ? "Actualiza la información del destino."
                  : "Completa los datos del nuevo destino."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="clientId" className="font-semibold">
                  Cliente *
                </Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                  required
                >
                  <SelectTrigger className="focus-ring">
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-semibold">
                  Nombre del Destino *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Obra principal, Sucursal Centro"
                  required
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion" className="font-semibold">
                  Dirección
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  placeholder="Dirección completa del lugar"
                  className="focus-ring"
                />
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
                  disabled={isSubmitting || !formData.nombre || !formData.clientId}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSkeleton className="w-4 h-4 mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingDestination ? "Guardar Cambios" : "Crear Destino"}
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