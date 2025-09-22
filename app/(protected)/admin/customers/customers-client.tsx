"use client";

import type React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Client as ClientType } from "@/lib/types";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useDebounce } from "@/hooks/use-debounce";
import { EmptyState } from "@/components/ui/empty-state";
import { customerSchema } from "@/lib/validations";

type FormErrors = {
  name?: string;
  rif?: string;
  address?: string;
  email?: string;
  phone?: string;
};

// --- Función mejorada para generar los items de la paginación ---
const getPaginationItems = (currentPage: number, pageCount: number, siblingCount = 1) => {
    const totalPageNumbers = siblingCount + 5;

    if (pageCount <= totalPageNumbers) {
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, pageCount);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < pageCount - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
        let leftItemCount = 3 + 2 * siblingCount;
        let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        return [...leftRange, "...", pageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        let rightItemCount = 3 + 2 * siblingCount;
        let rightRange = Array.from({ length: rightItemCount }, (_, i) => pageCount - rightItemCount + i + 1);
        return [1, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
        let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
        return [1, "...", ...middleRange, "...", pageCount];
    }

    return [];
};


export function CustomersClientUI({
  data,
  pageCount,
}: {
  data: ClientType[];
  pageCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<ClientType[]>(data);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ClientType | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    rif: "",
    address: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

  useEffect(() => {
    setCustomers(data);
  }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (debouncedSearchTerm) {
      params.set("q", debouncedSearchTerm);
      params.set("page", "1");
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`);
  }, [debouncedSearchTerm, router, searchParams]);

  const handleNewCustomer = useCallback(() => {
    setEditingCustomer(null);
    setFormData({ name: "", rif: "", address: "", email: "", phone: "" });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleEditCustomer = useCallback((customer: ClientType) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      rif: customer.rif || "",
      address: customer.address || "",
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        toast.error("Error de validación", {
          description: "Por favor, corrige los campos marcados.",
        });
        return;
      }

      const validatedData = validation.data;
      const method = editingCustomer ? "PATCH" : "POST";
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Error al guardar el cliente");
        }

        toast.success(
          `Cliente ${editingCustomer ? "actualizado" : "creado"} exitosamente.`
        );
        setShowDialog(false);
        router.refresh();
      } catch (err: any) {
        toast.error("Error al guardar", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingCustomer, formData, router]
  );

  const handleToggleStatus = useCallback(
    (customer: ClientType) => {
      const is_active = customer.is_active;
      confirm(
        {
          title: `¿Estás seguro?`,
          description: `Esta acción ${
            is_active ? "desactivará" : "activará"
          } al cliente "${customer.name}".`,
          confirmText: is_active ? "Desactivar" : "Activar",
          variant: is_active ? "destructive" : "default",
        },
        async () => {
          try {
            const res = await fetch(`/api/customers/${customer.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !is_active }),
            });
            if (!res.ok) throw new Error(await res.text());

            toast.success(
              `Cliente ${!is_active ? "activado" : "desactivado"} exitosamente.`
            );
            router.refresh();
          } catch (err: any) {
            toast.error("Error al cambiar el estado", {
              description: err.message,
            });
          }
        }
      );
    },
    [confirm, router]
  );

  const currentPage = Number(searchParams.get("page")) || 1;
  const paginationItems = getPaginationItems(currentPage, pageCount);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pageCount) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
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
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Clientes
              </h2>
              <p className="text-muted-foreground">
                Administra tu cartera de clientes
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
              placeholder="Buscar por nombre o RIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No se encontraron clientes"
                  description="Prueba con otro término de búsqueda o añade un nuevo cliente."
                  action={
                    <GradientButton
                      onClick={handleNewCustomer}
                      className="flex items-center space-x-2 mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Añadir Cliente</span>
                    </GradientButton>
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          customers.map((customer, index) => (
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
                      {customer.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {customer.rif || "Sin RIF"}
                    </p>
                  </div>
                  <Badge
                    variant={customer.is_active ? "default" : "secondary"}
                    className={customer.is_active ? "bg-gradient-primary" : ""}
                  >
                    {customer.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{customer.address}</span>
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
                    <span>{customer.is_active ? "Desactivar" : "Activar"}</span>
                  </Button>
                </div>
              </CardContent>
            </AnimatedCard>
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
            
            {/* Lógica de renderizado mejorada */}
            {paginationItems.map((item, index) =>
              item === "..." ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(item as number);
                    }}
                    // ✨ CORRECCIÓN FINAL: Usando 'is_active' como confirmaste.
                    is_active={currentPage === item}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                className={
                  currentPage === pageCount
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
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
           {/* ...el resto del formulario no cambia... */}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}