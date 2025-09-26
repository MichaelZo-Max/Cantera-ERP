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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Destination, Client } from "@/lib/types";
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";
import { destinationSchema } from "@/lib/validations";
import { useDebounce } from "@/hooks/use-debounce";

type FormErrors = {
  name?: string;
  direccion?: string;
  customer_id?: string;
};

type ClientsApiResponse = {
  data: Client[];
  totalPages: number;
};

export function DestinationsClientUI({
  initialDestinations,
  initialClients,
}: {
  initialDestinations: Destination[];
  initialClients: Client[];
}) {
  const [destinations, setDestinations] =
    useState<Destination[]>(initialDestinations);
  // ✨ CORRECCIÓN 1: Asegurar que el estado inicial siempre sea un arreglo.
  const [clients, setClients] = useState<Client[]>(initialClients || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    direccion: "",
    customer_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { isOpen, options, confirm, handleConfirm, handleCancel } =
    useConfirmation();

  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 500);
  const [clientPage, setClientPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(1);
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      setIsClientsLoading(true);
      try {
        const params = new URLSearchParams({
          page: clientPage.toString(),
          pageSize: "20",
          name: debouncedClientSearch,
        });
        const res = await fetch(`/api/customers?${params.toString()}`);
        if (!res.ok) throw new Error("No se pudieron cargar los clientes");

        const responseData: ClientsApiResponse = await res.json();
        
        // ✨ CORRECCIÓN 2: Lógica simplificada y más segura para procesar la respuesta.
        const newClients = Array.isArray(responseData.data) ? responseData.data : [];
        const totalPages = responseData.totalPages || 1;

        setClients((prev) =>
          clientPage === 1
            ? newClients
            : [...(Array.isArray(prev) ? prev : []), ...newClients]
        );
        setClientTotalPages(totalPages);

      } catch (error) {
        toast.error("Error al cargar clientes.");
        setClients([]); // En caso de error, se asegura de que sea un arreglo vacío.
      } finally {
        setIsClientsLoading(false);
      }
    };
    fetchClients();
  }, [debouncedClientSearch, clientPage]);
  
  const filteredDestinations = useMemo(
    () =>
      destinations.filter(
        (destination) =>
          destination.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (destination.address &&
            destination.address
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (destination.client?.name &&
            destination.client.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      ),
    [destinations, searchTerm]
  );

  const handleNewDestination = useCallback(() => {
    setEditingDestination(null);
    setFormData({ name: "", direccion: "", customer_id: "" });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleEditDestination = useCallback((destination: Destination) => {
    setEditingDestination(destination);
    setFormData({
      name: destination.name,
      direccion: destination.address || "",
      customer_id: destination.customer_id.toString(),
    });
    setFormErrors({});
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setFormErrors({});

      const validation = destinationSchema.safeParse(formData);

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

      const method = editingDestination ? "PATCH" : "POST";
      const url = editingDestination
        ? `/api/destinations/${editingDestination.id}`
        : "/api/destinations";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Error al guardar el destino");
        }

        const savedDestination = await res.json();

        setDestinations((prev) =>
          editingDestination
            ? prev.map((d) =>
                d.id === savedDestination.id ? savedDestination : d
              )
            : [...prev, savedDestination]
        );

        toast.success(
          `Destino ${
            editingDestination ? "actualizado" : "creado"
          } exitosamente.`
        );

        setShowDialog(false);
      } catch (err: any) {
        toast.error("Error al guardar", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingDestination, formData]
  );

  const handleToggleStatus = useCallback(
    (destination: Destination) => {
      // ... (código sin cambios)
    },
    [confirm]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ... (JSX sin cambios) ... */}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          {/* ... (JSX del DialogHeader sin cambios) ... */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente Asociado</Label>
              <SearchableSelect
                value={formData.customer_id}
                onChange={(value) =>
                  setFormData({ ...formData, customer_id: value })
                }
                placeholder="Seleccionar cliente..."
                // ✨ CORRECCIÓN 3: Asegurar que las options se generan desde un arreglo.
                options={(clients || []).map((client) => ({
                  value: client.id.toString(),
                  label: client.name,
                }))}
                onSearch={(query) => {
                  setClientPage(1);
                  setClientSearch(query);
                }}
                onLoadMore={() => {
                  if (clientPage < clientTotalPages && !isClientsLoading) {
                    setClientPage((p) => p + 1);
                  }
                }}
                hasNextPage={clientPage < clientTotalPages}
                isLoading={isClientsLoading}
                disabled={isSubmitting}
                className={`w-full focus-ring ${
                  formErrors.customer_id ? "border-red-500" : ""
                }`}
              />
              {formErrors.customer_id && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.customer_id}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Nombre del Destino *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Obra principal, Sucursal Centro"
                className={`focus-ring ${
                  formErrors.name ? "border-red-500" : ""
                }`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion" className="font-semibold">
                Dirección
              </Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
                placeholder="Dirección completa del lugar"
                className={`focus-ring ${
                  formErrors.direccion ? "border-red-500" : ""
                }`}
              />
              {formErrors.direccion && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.direccion}
                </p>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <GradientButton type="submit" disabled={isSubmitting}>
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