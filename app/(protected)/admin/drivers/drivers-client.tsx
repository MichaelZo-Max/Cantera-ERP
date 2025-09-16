"use client";

import type React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Driver, Client } from "@/lib/types"; // Asegúrate de tener Customer en tus tipos
import {
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Phone,
  ChevronsUpDown,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

// =================================================================
// Componente Reutilizable para Selección Múltiple de Clientes
// =================================================================
function MultiSelectCustomers({
  allCustomers,
  selectedIds,
  onChange,
}: {
  allCustomers: Client[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (customerId: number) => {
    const newSelectedIds = selectedIds.includes(customerId)
      ? selectedIds.filter((id) => id !== customerId)
      : [...selectedIds, customerId];
    onChange(newSelectedIds);
  };

  const selectedCustomers = useMemo(
    () => allCustomers.filter((c) => selectedIds.includes(c.id)),
    [allCustomers, selectedIds]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto"
        >
          <div className="flex flex-wrap gap-1">
            {selectedCustomers.length > 0 ? (
              selectedCustomers.map((customer) => (
                <Badge
                  key={customer.id}
                  variant="secondary"
                  className="rounded-sm"
                >
                  {customer.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">
                Seleccionar clientes...
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {allCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => handleSelect(customer.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(customer.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


// =================================================================
// Componente Principal de la UI de Choferes
// =================================================================
export function DriversClientUI({
  initialDrivers,
  initialCustomers, // Recibimos la lista de clientes
}: {
  initialDrivers: Driver[];
  initialCustomers: Client[];
}) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [customers, setCustomers] = useState<Client[]>(initialCustomers);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  // Adaptamos el estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    docId: "",
    phone: "",
    customer_ids: [] as number[], // Array para los IDs de clientes
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

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

  const handleNewDriver = useCallback(() => {
    setEditingDriver(null);
    setFormData({ name: "", docId: "", phone: "", customer_ids: [] });
    setApiError(null);
    setShowDialog(true);
  }, []);

  const handleEditDriver = useCallback(async (driver: Driver) => {
    // Al editar, buscamos los datos completos del chófer para obtener sus clientes
    try {
        const res = await fetch(`/api/drivers/${driver.id}`);
        if (!res.ok) throw new Error("No se pudo obtener la información del chófer.");
        const fullDriverData = await res.json();
        
        setEditingDriver(fullDriverData);
        setFormData({
            name: fullDriverData.name,
            docId: fullDriverData.docId || "",
            phone: fullDriverData.phone || "",
            // Extraemos los IDs de los clientes asociados
            customer_ids: fullDriverData.customers?.map((c: Client) => c.id) || [],
        });
        setApiError(null);
        setShowDialog(true);
    } catch (error: any) {
        toast.error("Error al cargar datos", { description: error.message });
    }
  }, []);

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
          // El formData ahora incluye `customer_ids`
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
  );

  const handleToggleStatus = useCallback(
    (driver: Driver) => {
      // (La lógica de este manejador no necesita cambios)
      // ...
    },
    [confirm]
  );

  return (
    <div className="space-y-8 animate-fade-in">
        {/* ... (Header y barra de búsqueda sin cambios) ... */}

        {/* ... (Grilla de Choferes sin cambios) ... */}

        {/* Dialog de Crear/Editar (MODIFICADO) */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    {/* ... (Título y descripción del diálogo sin cambios) ... */}
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* ... (Campos de Nombre, Documento, Teléfono sin cambios) ... */}
                    
                    {/* NUEVO CAMPO: Selector Múltiple de Clientes */}
                    <div className="space-y-2">
                        <Label htmlFor="customers" className="font-semibold">
                            Clientes Asociados
                        </Label>
                        <MultiSelectCustomers
                            allCustomers={customers}
                            selectedIds={formData.customer_ids}
                            onChange={(ids) =>
                                setFormData({ ...formData, customer_ids: ids })
                            }
                        />
                    </div>

                    {apiError && <p className="text-sm text-red-500">{apiError}</p>}

                    <DialogFooter className="pt-4">
                        {/* ... (Botones de Cancelar y Guardar sin cambios) ... */}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}