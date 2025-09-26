// components/modals/create-driver-modal.tsx
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
import { Save, UserCheck, AlertCircle } from "lucide-react";
import { driverSchema } from "@/lib/validations";
import type { Driver } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDriver: Driver) => void;
}

type FormErrors = {
  name?: string[];
  docId?: string[];
  phone?: string[];
};

export function CreateDriverModal({ isOpen, onClose, onSuccess }: CreateDriverModalProps) {
  const [formData, setFormData] = useState({ name: "", docId: "", phone: "", customer_ids: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    // customer_ids no es requerido para el modal rápido, se puede dejar vacío.
    const validation = driverSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFormErrors(errors as FormErrors);
      setIsSubmitting(false);
      toast.error("Error de validación", { description: "Por favor, corrige los campos marcados." });
      return;
    }

    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Error al crear el chofer");
      }
      
      const newDriver = await res.json();
      toast.success("¡Chofer creado exitosamente!");
      onSuccess(newDriver);
      onClose();
    } catch (err: any) {
      toast.error("Error al crear el chofer", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", docId: "", phone: "", customer_ids: [] });
    setFormErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" />Nuevo Chofer</DialogTitle>
          <DialogDescription>Completa los datos del nuevo chofer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input 
              id="name" 
              placeholder="Ej: Pedro Pérez" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className={cn("mt-1.5", formErrors.name && "border-red-500")} 
            />
            {formErrors.name && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.name[0]}</p>}
          </div>
          <div>
            <Label htmlFor="docId">Documento de Identidad</Label>
            <Input 
              id="docId" 
              placeholder="Ej: V-12345678" 
              value={formData.docId} 
              onChange={(e) => setFormData({ ...formData, docId: e.target.value })} 
              className={cn("mt-1.5", formErrors.docId && "border-red-500")}
            />
             {formErrors.docId && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.docId[0]}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input 
              id="phone" 
              placeholder="Ej: 0412-1234567" 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn("mt-1.5", formErrors.phone && "border-red-500")}
            />
            {formErrors.phone && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{formErrors.phone[0]}</p>}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
            <GradientButton type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Creando..." : "Crear Chofer"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}