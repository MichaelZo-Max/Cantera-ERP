"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
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
import type { Driver, Client } from "@/lib/types";
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
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedCard } from "@/components/ui/animated-card";
import { PageHeader } from "@/components/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { driverSchema } from "@/lib/validations";

// ✨ HOOK DEBOUNCE: Para optimizar la búsqueda y no llamar a la API en cada tecleo
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

type FormErrors = {
  name?: string[];
  docId?: string[];
  phone?: string[];
  customer_ids?: string[];
};

export function DriversClientUI({
  initialDrivers,
  initialCustomers,
  totalPages, // Recibimos el total de páginas desde el servidor
}: {
  initialDrivers: Driver[];
  initialCustomers: Client[];
  totalPages: number;
}) {
  // =================================================================
  // ✨ COMPONENTE MULTI-SELECT DE CLIENTES CON PAGINACIÓN
  // =================================================================
  const MultiSelectCustomers = React.forwardRef<
    HTMLButtonElement,
    {
      initialCustomers: Client[];
      selectedIds: number[];
      onChange: (ids: number[]) => void;
      onLoadMore: (searchTerm: string, page: number) => Promise<Client[]>;
      totalPages: number;
      error?: boolean;
    }
  >(
    (
      {
        initialCustomers,
        selectedIds,
        onChange,
        onLoadMore,
        totalPages,
        error,
      },
      ref
    ) => {
      const [open, setOpen] = useState(false);
      const [customers, setCustomers] = useState<Client[]>(initialCustomers);
      const [page, setPage] = useState(1);
      const [searchTerm, setSearchTerm] = useState("");
      const [isLoading, setIsLoading] = useState(false);
      const debouncedSearchTerm = useDebounce(searchTerm, 300);

      // Cargar más clientes al hacer scroll
      const loadMoreCustomers = useCallback(async () => {
        if (page >= totalPages || isLoading) return;
        setIsLoading(true);
        const nextPage = page + 1;
        const newCustomers = await onLoadMore(debouncedSearchTerm, nextPage);
        setCustomers((prev) => [...prev, ...newCustomers]);
        setPage(nextPage);
        setIsLoading(false);
      }, [page, totalPages, isLoading, onLoadMore, debouncedSearchTerm]);

      // Efecto para buscar clientes cuando el término de búsqueda cambia
      useEffect(() => {
        const searchCustomers = async () => {
          setIsLoading(true);
          setPage(1); // Reiniciar la página en una nueva búsqueda
          const newCustomers = await onLoadMore(debouncedSearchTerm, 1);
          setCustomers(newCustomers);
          setIsLoading(false);
        };
        searchCustomers();
      }, [debouncedSearchTerm, onLoadMore]);

      // Manejador del scroll para carga infinita
      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Si el scroll está a 20px del final, carga más
        if (scrollHeight - scrollTop - clientHeight < 20) {
          loadMoreCustomers();
        }
      };

      const handleSelect = (customer_id: number) => {
        const newSelectedIds = selectedIds.includes(customer_id)
          ? selectedIds.filter((id) => id !== customer_id)
          : [...selectedIds, customer_id];
        onChange(newSelectedIds);
      };

      // Encuentra los clientes seleccionados entre los clientes ya cargados y los iniciales
      const selectedCustomers = useMemo(() => {
        const allAvailableCustomers = [...initialCustomers, ...customers];
        const uniqueCustomers = Array.from(
          new Map(allAvailableCustomers.map((c) => [c.id, c])).values()
        );
        return uniqueCustomers.filter((c) => selectedIds.includes(c.id));
      }, [selectedIds, customers, initialCustomers]);

      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between h-auto",
                error && "border-red-500"
              )}
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
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0 z-[99]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput
                placeholder="Buscar cliente..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList onScroll={handleScroll}>
                <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
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
                {isLoading && (
                  <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
  );
  MultiSelectCustomers.displayName = "MultiSelectCustomers";

  // =================================================================
  // ✨ ESTADOS Y LÓGICA PRINCIPAL DEL COMPONENTE
  // =================================================================

  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    docId: "",
    phone: "",
    customer_ids: [] as number[],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
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
    setFormErrors({});
    setApiError(null);
    setShowDialog(true);
  }, []);

  const handleEditDriver = useCallback((driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      docId: driver.docId || "",
      phone: driver.phone || "",
      customer_ids: driver.clients?.map((c) => c.id) || [],
    });
    setFormErrors({});
    setApiError(null);
    setShowDialog(true);
  }, []);

  // Función para cargar más clientes (pasada como prop a MultiSelectCustomers)
  const fetchMoreCustomers = async (
    searchTerm: string,
    page: number
  ): Promise<Client[]> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      // La API debe soportar los parámetros 'page', 'limit' y 'search'
      const res = await fetch(
        `${baseUrl}/api/customers?page=${page}&limit=20&search=${searchTerm}`
      );
      if (!res.ok) throw new Error("Failed to fetch more clients");
      const data = await res.json();
      return data.data; // Asumiendo que la API devuelve { data: [], totalPages: X }
    } catch (error) {
      console.error("Error cargando más clientes:", error);
      toast.error("No se pudieron cargar más clientes.");
      return [];
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setApiError(null);
      setFormErrors({});

      const validation = driverSchema.safeParse(formData);

      if (!validation.success) {
        const zodErrors = validation.error.flatten().fieldErrors;
        setFormErrors(zodErrors);
        setIsSubmitting(false);
        toast.error("Error de validación", {
          description: "Por favor, corrige los campos marcados en rojo.",
        });
        return;
      }

      const body = validation.data;
      const method = editingDriver ? "PATCH" : "POST";
      const url = editingDriver
        ? `/api/drivers/${editingDriver.id}`
        : "/api/drivers";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          try {
            const errorData = await res.json();
            throw new Error(
              errorData.message || "Error al guardar. Verifica los datos."
            );
          } catch {
            const errorText = await res.text();
            throw new Error(errorText || "Ocurrió un error en el servidor.");
          }
        }

        const fetchResponse = await fetch("/api/drivers");
        const updatedDrivers = await fetchResponse.json();
        setDrivers(updatedDrivers);

        toast.success(
          `Chofer ${editingDriver ? "actualizado" : "creado"} exitosamente.`
        );
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
      confirm(
        {
          title: `¿${driver.is_active ? "Desactivar" : "Activar"} Chofer?`,
          description: `¿Estás seguro de que quieres ${
            driver.is_active ? "desactivar" : "activar"
          } a ${driver.name}?`,
          variant: driver.is_active ? "destructive" : "default",
        },
        async () => {
          try {
            const res = await fetch(`/api/drivers/${driver.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !driver.is_active }),
            });

            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(errorText || "Error al cambiar el estado");
            }

            const fetchResponse = await fetch("/api/drivers");
            const updatedDrivers = await fetchResponse.json();
            setDrivers(updatedDrivers);

            toast.success("Estado del chofer actualizado correctamente.");
          } catch (err: any) {
            toast.error("Error al actualizar", { description: err.message });
          }
        }
      );
    },
    [confirm]
  );

  // =================================================================
  // ✨ RENDERIZADO DEL COMPONENTE
  // =================================================================

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Choferes"
        description="Gestiona los choferes de la empresa."
        actions={
          <Button onClick={handleNewDriver}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Chofer
          </Button>
        }
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o documento..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDrivers.map((driver, index) => (
            <AnimatedCard
              key={driver.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">
                    {driver.name}
                  </CardTitle>
                  <Badge variant={driver.is_active ? "default" : "destructive"}>
                    {driver.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {driver.docId && (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4" />
                      <span>{driver.docId}</span>
                    </div>
                  )}
                  {driver.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{driver.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Label className="font-semibold text-xs text-foreground">
                    Clientes Asociados:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {driver.clients && driver.clients.length > 0 ? (
                      driver.clients.map((client) => (
                        <Badge
                          key={client.id}
                          variant="secondary"
                          className="font-normal"
                        >
                          {client.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No tiene clientes asignados.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t mt-auto">
                <div className="flex space-x-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditDriver(driver)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant={driver.is_active ? "destructive" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleStatus(driver)}
                  >
                    {driver.is_active ? (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activar
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </AnimatedCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title="No se encontraron choferes"
          description="Prueba con otro término de búsqueda o crea un nuevo chofer."
        />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? "Editar Chofer" : "Crear Nuevo Chofer"}
            </DialogTitle>
            <DialogDescription>
              {editingDriver
                ? "Actualiza los datos del chofer."
                : "Completa el formulario para añadir un nuevo chofer."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* ... Campos de Nombre, Documento y Teléfono (se mantienen igual) ... */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={cn(formErrors.name && "border-red-500")}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.name[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="docId" className="font-semibold">
                Documento de Identidad
              </Label>
              <Input
                id="docId"
                value={formData.docId}
                onChange={(e) =>
                  setFormData({ ...formData, docId: e.target.value })
                }
                className={cn(formErrors.docId && "border-red-500")}
              />
              {formErrors.docId && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.docId[0]}
                </p>
              )}
            </div>

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
                className={cn(formErrors.phone && "border-red-500")}
              />
              {formErrors.phone && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.phone[0]}
                </p>
              )}
            </div>

            {/* --- ✨ CAMPO CLIENTES CON PAGINACIÓN --- */}
            <div className="space-y-2">
              <Label htmlFor="customers" className="font-semibold">
                Clientes Asociados
              </Label>
              <MultiSelectCustomers
                initialCustomers={initialCustomers}
                selectedIds={formData.customer_ids}
                onChange={(ids) =>
                  setFormData({ ...formData, customer_ids: ids })
                }
                onLoadMore={fetchMoreCustomers}
                totalPages={totalPages}
                error={!!formErrors.customer_ids}
              />
              {formErrors.customer_ids && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />{" "}
                  {formErrors.customer_ids[0]}
                </p>
              )}
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {options && (
        <ConfirmationDialog
          open={isOpen}
          onOpenChange={(open) => !open && handleCancel()}
          title={options.title}
          description={options.description}
          onConfirm={handleConfirm}
          variant={options.variant}
        />
      )}
    </div>
  );
}
