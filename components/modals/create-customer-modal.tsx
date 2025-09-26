// components/modals/create-customer-modal.tsx
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
import { Save, Users } from "lucide-react";
import { customerSchema } from "@/lib/validations";
import type { Client } from "@/lib/types";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newClient: Client) => void;
}

type FormErrors = {
  name?: string;
  rif?: string;
};

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({ name: "", rif: "", address: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    const validation = customerSchema.safeParse(formData);
    if (!validation.success) {
      const errors: FormErrors = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path[0] as keyof FormErrors] = issue.message;
      });
      setFormErrors(errors);
      setIsSubmitting(false);
      toast.error("Error de validación", { description: "Por favor, corrige los campos marcados." });
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Error al crear el cliente");
      }
      
      const newClient = await res.json();
      toast.success("¡Cliente creado exitosamente!");
      onSuccess(newClient); // Devuelve el nuevo cliente al componente padre
      onClose(); // Cierra el modal
    } catch (err: any) {
      toast.error("Error al crear el cliente", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Nuevo Cliente</DialogTitle>
          <DialogDescription>Completa los datos del nuevo cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">Nombre del Cliente *</Label>
            <Input id="name" placeholder="Ej: John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" />
            {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <Label htmlFor="rif">RIF</Label>
            <Input id="rif" placeholder="Ej: J-12345678-9" value={formData.rif} onChange={(e) => setFormData({ ...formData, rif: e.target.value })} className="mt-1.5" />
            {formErrors.rif && <p className="text-red-500 text-sm mt-1">{formErrors.rif}</p>}
          </div>
          {/* Puedes añadir los demás campos si lo deseas (dirección, email, teléfono) */}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <GradientButton type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Creando..." : "Crear Cliente"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}