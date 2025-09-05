// app/(protected)/admin/customers/customers-client.tsx
"use client";

import type React from "react";
import { useState } from "react";
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
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import type { Client } from "@/lib/types";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export function CustomersClientUI({
  initialCustomers,
}: {
  initialCustomers: Client[];
}) {
  const [customers, setCustomers] = useState<Client[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.rif &&
        customer.rif.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setFormData({ nombre: "", rif: "", address: "", phone: "", email: "" });
    setApiError(null);
    setShowDialog(true);
  };

  const handleEditCustomer = (customer: Client) => {
    setEditingCustomer(customer);
    setFormData({
      nombre: customer.nombre,
      rif: customer.rif || "",
      address: customer.address || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setApiError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    const method = editingCustomer ? "PATCH" : "POST";
    const url = editingCustomer
      ? `/api/customers/${editingCustomer.id}`
      : "/api/customers";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el cliente");
      }

      const savedCustomer = await res.json();

      if (editingCustomer) {
        setCustomers(
          customers.map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
        );
        toast.success("Cliente actualizado exitosamente.");
      } else {
        setCustomers((prev) => [...prev, savedCustomer]);
        toast.success("Cliente creado exitosamente.");
      }

      setShowDialog(false);
    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (customer: Client) => {
    const is_active = customer.is_active;
    if (
      !confirm(
        `¿Estás seguro de que quieres ${
          is_active ? "desactivar" : "activar"
        } este cliente?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updatedCustomer = await res.json();
      setCustomers(
        customers.map((c) =>
          c.id === updatedCustomer.id ? updatedCustomer : c
        )
      );
      toast.success(
        `Cliente ${!is_active ? "activado" : "desactivado"} exitosamente.`
      );
    } catch (err: any) {
      toast.error("Error al cambiar el estado", { description: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Clientes
              </h2>
              <p className="text-muted-foreground">
                Administra el catálogo de clientes
              </p>
            </div>
          </div>
        </div>
        <GradientButton
          onClick={handleNewCustomer}
          className="flex items-center space-x-2 animate-pulse-glow"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Cliente</span>
        </GradientButton>
      </div>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por nombre, RFC o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full">
            <AnimatedCard className="glass">
              <CardContent className="pt-12 pb-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">
                  No se encontraron clientes
                </p>
              </CardContent>
            </AnimatedCard>
          </div>
        ) : (
          filteredCustomers.map((customer, index) => (
            <AnimatedCard
              key={customer.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      {customer.nombre}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {customer.rif || "Sin RFC"}
                    </p>
                  </div>
                  <Badge
                    variant={customer.is_active ? "default" : "secondary"}
                    className={
                      customer.is_active ? "bg-gradient-primary" : ""
                    }
                  >
                    {customer.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {customer.address && (
                    <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCustomer(customer)}
                    className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant={customer.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(customer)}
                    className="flex items-center space-x-1 transition-smooth"
                  >
                    {customer.is_active ? (
                      <Trash2 className="h-3 w-3" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>
                      {customer.is_active ? "Desactivar" : "Activar"}
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Actualiza la información del cliente."
                : "Completa los datos del nuevo cliente."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-semibold">
                  Nombre / Razón Social *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Constructora Central"
                  required
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rif" className="font-semibold">
                  RFC / RIF
                </Label>
                <Input
                  id="rif"
                  value={formData.rif}
                  onChange={(e) =>
                    setFormData({ ...formData, rif: e.target.value })
                  }
                  placeholder="Ej: J-12345678-9"
                  className="focus-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="font-semibold">
                Dirección
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Dirección fiscal completa"
                className="focus-ring"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Ej: contacto@empresa.com"
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
                disabled={isSubmitting || !formData.nombre}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
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