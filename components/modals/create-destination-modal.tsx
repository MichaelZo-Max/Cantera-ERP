// components/modals/create-destination-modal.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GradientButton } from "@/components/ui/gradient-button";
import { Save, MapPin, AlertCircle } from "lucide-react";
import { destinationSchema } from "@/lib/validations";
import type { Destination } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreateDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDestination: Destination) => void;
  customer_id?: string | null; // El ID del cliente al que se asociará el destino
}

type FormErrors = {
  name?: string[];
  direccion?: string[];
  customer_id?: string[];
};

export function CreateDestinationModal({
  isOpen,
  onClose,
  onSuccess,
  customer_id,
}: CreateDestinationModalProps) {
  const [formData, setFormData] = useState({ name: "", direccion: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer_id) {
      toast.error("Error", {
        description: "Se requiere un cliente para crear un destino.",
      });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    const dataToValidate = {
      ...formData,
      customer_id: customer_id,
    };

    const validation = destinationSchema.safeParse(dataToValidate);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFormErrors(errors as FormErrors);
      setIsSubmitting(false);
      toast.error("Error de validación", {
        description: "Por favor, corrige los campos marcados.",
      });
      return;
    }

    try {
      const res = await fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Error al crear el destino");
      }

      const newDestination = await res.json();
      toast.success("¡Destino creado exitosamente!");
      onSuccess(newDestination);
      onClose();
    } catch (err: any) {
      toast.error("Error al crear el destino", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpiar formulario al cerrar
  const handleClose = () => {
    setFormData({ name: "", direccion: "" });
    setFormErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Nuevo Destino
          </DialogTitle>
          <DialogDescription>
            Completa los datos del nuevo destino. Se asociará al cliente
            seleccionado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">Nombre del Destino *</Label>
            <Input
              id="name"
              placeholder="Ej: Obra principal"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={cn("mt-1.5", formErrors.name && "border-red-500")}
            />
            {formErrors.name && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.name[0]}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Ej: Av. Principal, Edificio Central"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              className={cn("mt-1.5", formErrors.direccion && "border-red-500")}
            />
            {formErrors.direccion && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.direccion[0]}
              </p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <GradientButton
              type="submit"
              disabled={isSubmitting || !customer_id}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Creando..." : "Crear Destino"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
