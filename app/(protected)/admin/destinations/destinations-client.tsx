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

  const handleToggleStatus = async (destination: Destination) => {
    const isActive = destination.is_active;
    if (
      !confirm(
        `¿Estás seguro de que quieres ${
          isActive ? "desactivar" : "activar"
        } este destino?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/destinations/${destination.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!res.ok) throw new Error(await res.text());
      const updatedItem = await res.json();

      updatedItem.client = destination.client;

      setDestinations(
        destinations.map((d) => (d.id === updatedItem.id ? updatedItem : d))
      );
      toast.success(
        `Destino ${!isActive ? "activado" : "desactivado"} con éxito.`
      );
    } catch (err: any) {
      toast.error("Error al cambiar el estado", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Destinos</h2>
          <p className="text-muted-foreground">
            Gestiona las direcciones de entrega de los clientes
          </p>
        </div>
        <Button
          onClick={handleNewDestination}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Destino</span>
        </Button>
      </div>

      <Card>
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
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDestinations.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No se encontraron destinos
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredDestinations.map((destination) => (
            <Card
              key={destination.id}
              className="hover:shadow-md transition-shadow"
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
            </Card>
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
                    <SelectItem key={client.id} value={client.id}>
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
              <Button
                type="submit"
                disabled={
                  isSubmitting || !formData.clientId || !formData.nombre
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting
                  ? "Guardando..."
                  : editingDestination
                  ? "Guardar Cambios"
                  : "Crear Destino"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
