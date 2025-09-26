// components/modals/create-truck-modal.tsx
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
import { Save, TruckIcon, AlertCircle } from "lucide-react";
import { truckSchema } from "@/lib/validations";
import type { Truck } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreateTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTruck: Truck) => void;
}

type FormErrors = {
  placa?: string[];
  brand?: string[];
  model?: string[];
  capacity?: string[];
};

export function CreateTruckModal({ isOpen, onClose, onSuccess }: CreateTruckModalProps) {
  const [formData, setFormData] = useState({ placa: "", brand: "", model: "", capacity: "" as string | number });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    const validation = truckSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFormErrors(errors as FormErrors);
      setIsSubmitting(false);
      toast.error("Error de validación", { description: "Por favor, corrige los campos marcados." });
      return;
    }

    try {
      const res = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Error al crear el camión");
      }
      
      const newTruck = await res.json();
      toast.success("¡Camión creado exitosamente!");
      onSuccess(newTruck);
      onClose();
    } catch (err: any) {
      toast.error("Error al crear el camión", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setFormData({ placa: "", brand: "", model: "", capacity: "" });
    setFormErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TruckIcon className="h-5 w-5 text-primary" />Nuevo Camión</DialogTitle>
          <DialogDescription>Completa los datos del nuevo vehículo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="placa">Placa *</Label>
            <Input 
              id="placa" 
              placeholder="Ej: A01BC2D" 
              value={formData.placa} 
              onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
              className={cn("mt-1.5", formErrors.placa && "border-red-500")} 
            />
            {formErrors.placa && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.placa[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input 
                id="brand" 
                placeholder="Ej: Mack" 
                value={formData.brand} 
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                className={cn("mt-1.5", formErrors.brand && "border-red-500")}
              />
               {formErrors.brand && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.brand[0]}</p>}
            </div>
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input 
                id="model" 
                placeholder="Ej: Granite" 
                value={formData.model} 
                onChange={(e) => setFormData({ ...formData, model: e.target.value })} 
                className={cn("mt-1.5", formErrors.model && "border-red-500")}
              />
              {formErrors.model && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.model[0]}</p>}
            </div>
          </div>
          <div>
              <Label htmlFor="capacity">Capacidad (m³)</Label>
              <Input
                id="capacity"
                type="number"
                step="0.01"
                min="0"
                placeholder="15.0"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className={cn("mt-1.5", formErrors.capacity && "border-red-500")}
              />
              {formErrors.capacity && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.capacity[0]}</p>}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
            <GradientButton type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Creando..." : "Crear Camión"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}