// app/(protected)/admin/destinations/destinations-client.tsx
"use client";

import type React from "react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Destination, Client } from "@/lib/types";
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";


// El componente ahora recibe los datos iniciales como props
export function DestinationsClientUI({
  initialDestinations,
  initialClients,
}: {
  initialDestinations: Destination[];
  initialClients: Client[];
}) {
  const [destinations, setDestinations] =
    useState<Destination[]>(initialDestinations);
  const [clients] = useState<Client[]>(initialClients);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    nombre: "",
    direccion: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const filteredDestinations = destinations.filter((dest) => {
    const clientName = dest.client?.nombre?.toLowerCase() ?? "";
    return (
      dest.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.includes(searchTerm.toLowerCase()) ||
      (dest.direccion &&
        dest.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleNewDestination = () => {
    setEditingDestination(null);
    setFormData({ clientId: "", nombre: "", direccion: "" });
    setApiError(null);
    setShowDialog(true);
  };

  const handleEditDestination = (destination: Destination) => {
    setEditingDestination(destination);
    setFormData({
      clientId: String(destination.clientId),
      nombre: destination.nombre,
      direccion: destination.direccion || "",
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

    const body = { ...formData };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el destino");
      }

      const savedDestination = await res.json();
      
      // Adjuntar la información del cliente al nuevo objeto para mostrarlo correctamente
      const client = clients.find(c => c.id === savedDestination.clientId);
      if(client) {
          savedDestination.client = client;
      }


      if (editingDestination) {
        setDestinations(
          destinations.map((d) =>
            d.id === savedDestination.id ? savedDestination : d
          )
        );
        toast.success("Destino actualizado exitosamente.");
      } else {
        setDestinations([...destinations, savedDestination]);
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
    const isActive = destination.is_active;
    confirm({
      title: `¿Estás seguro?`,
      description: `Esta acción ${
        isActive ? "desactivará" : "activará"
      } el destino "${destination.nombre}".`,
      confirmText: isActive ? "Desactivar" : "Activar",
      variant: isActive ? "destructive" : "default",
    },
    async () => {
        try {
            const res = await fetch(`/api/destinations/${destination.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !isActive }),
            });
      
            if (!res.ok) throw new Error(await res.text());
            
            // Actualizar el estado localmente para reflejar el cambio
            setDestinations(destinations.map(d => 
                d.id === destination.id 
                    ? { ...d, is_active: !isActive } 
                    : d
            ));

            toast.success(
              `Destino ${!isActive ? "activado" : "desactivado"} con éxito.`
            );
          } catch (err: any) {
            toast.error("Error al cambiar el estado", { description: err.message });
          }
    });

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
                        Gestiona las direcciones de entrega de los clientes
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

      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre de destino, cliente o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDestinations.length === 0 ? (
          <div className="col-span-full">
            <AnimatedCard className="glass">
              <CardContent className="pt-6 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No se encontraron destinos
                </p>
              </CardContent>
            </AnimatedCard>
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
                    <CardTitle className="text-lg truncate">
                      {destination.nombre}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {destination.client?.nombre || "Cliente no encontrado"}
                    </p>
                  </div>
                  <Badge
                    variant={destination.is_active ? "default" : "secondary"}
                  >
                    {destination.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {destination.direccion && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {destination.direccion}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDestination(destination)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant={destination.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(destination)}
                    className="flex items-center space-x-1"
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editingDestination ? "Editar Destino" : "Nuevo Destino"}
            </DialogTitle>
            <DialogDescription>
              {editingDestination
                ? "Actualiza los detalles del destino."
                : "Añade un nuevo destino para un cliente."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value })
                }
                required
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Selecciona un cliente" />
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
              <Label htmlFor="nombre">Nombre del Destino *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Obra Principal, Almacén Central"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea
                id="direccion"
                value={formData.direccion}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
                placeholder="Dirección completa del destino"
                rows={3}
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
                disabled={
                  isSubmitting || !formData.clientId || !formData.nombre
                }
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