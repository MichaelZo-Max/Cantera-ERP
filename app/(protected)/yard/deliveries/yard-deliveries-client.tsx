"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";

import type {
  Delivery as BaseDelivery,
  Order,
  Truck as TruckType,
  Driver,
} from "@/lib/types";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  SearchableSelect,
  type SearchableSelectOption as Option,
} from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PhotoInput } from "@/components/forms/photo-input";
import {
  Plus,
  CheckCircle,
  Clock,
  User,
  Truck as TruckIcon,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Zod Validation Schemas ---
const createDeliverySchema = z.object({
  order_id: z.string().min(1, "Debes seleccionar un pedido."),
  truck_id: z.string().min(1, "Debes seleccionar un camión."),
  driver_id: z.string().min(1, "Debes seleccionar un conductor."),
});

const confirmLoadSchema = z.object({
  notes: z.string().optional(),
  loadPhoto: z.instanceof(File, {
    message: "La foto de carga es obligatoria.",
  }),
  loadedItems: z
    .array(
      z.object({
        pedido_item_id: z.string(),
        dispatched_quantity: z
          .number()
          .min(0, "La cantidad no puede ser negativa."),
      })
    )
    .min(1, "Debe haber al menos un item a despachar.")
    .refine((items) => items.some((item) => item.dispatched_quantity > 0), {
      message:
        "Debes ingresar una cantidad a cargar mayor a cero para al menos un item.",
    }),
});

// --- Type Definitions ---
type CreateDeliveryFormValues = z.infer<typeof createDeliverySchema>;
type ConfirmLoadFormValues = z.infer<typeof confirmLoadSchema>;

type Delivery = BaseDelivery & {
  totalDispatched?: number;
};

interface YardClientProps {
  initialDeliveries: Delivery[];
  initialActiveOrders: Order[];
  initialTrucks: TruckType[];
  initialDrivers: Driver[];
}

// --- Reusable RHF Controlled Component ---
const RHFSearchableSelect = ({
  control,
  name,
  label,
  options,
  placeholder,
  disabled,
}: {
  control: any;
  name: string;
  label: string;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <SearchableSelect
          value={field.value}
          onChange={field.onChange}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
        />
        <FormMessage />
      </FormItem>
    )}
  />
);

const DeliveryCard = React.memo(
  ({
    delivery,
    onSelect,
  }: {
    delivery: Delivery;
    onSelect: (delivery: Delivery) => void;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(delivery)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-lg flex items-center gap-2">
              <TruckIcon className="h-5 w-5" /> {delivery.truck.placa}
            </p>
            <p className="text-sm text-muted-foreground">
              Despacho ID: {delivery.delivery_id}
            </p>
          </div>
          <Badge
            variant={delivery.estado === "CARGADA" ? "default" : "secondary"}
          >
            Pedido #{delivery.orderDetails.order_number}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Conductor:</span>
          <span className="truncate">{delivery.driver.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Cliente:</span>
          <span className="truncate">{delivery.orderDetails.client.name}</span>
        </div>
        {delivery.loadPhoto && (
          <div className="relative h-40 w-full overflow-hidden rounded-md border group mt-2">
            <Image
              src={delivery.loadPhoto}
              alt={`Foto de carga`}
              fill
              style={{ objectFit: "cover" }}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
);
DeliveryCard.displayName = "DeliveryCard";

// --- Main Client Component ---
export function YardDeliveriesClientUI({
  initialDeliveries,
  initialActiveOrders,
  initialTrucks,
  initialDrivers,
}: YardClientProps) {
  const { user } = useAuth();

  // --- State Management ---
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);

  // --- React Hook Form Instances ---
  const createTripForm = useForm<CreateDeliveryFormValues>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: {
      order_id: "",
      truck_id: "",
      driver_id: "",
    },
  });

  const confirmLoadForm = useForm<ConfirmLoadFormValues>({
    resolver: zodResolver(confirmLoadSchema),
    defaultValues: {
      notes: "",
      loadedItems: [],
    },
  });

  const { fields: loadedItemsFields, replace: replaceLoadedItems } =
    useFieldArray({
      control: confirmLoadForm.control,
      name: "loadedItems",
    });

  // --- Derived State (Memoized for Performance) ---
  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(
      (d) =>
        (d.truck.placa?.toLowerCase() ?? "").includes(query) ||
        (d.driver.name?.toLowerCase() ?? "").includes(query) ||
        (d.orderDetails.client.name?.toLowerCase() ?? "").includes(query) ||
        (d.delivery_id.toString() ?? "").includes(query)
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.estado === "PENDING"),
    [filteredDeliveries]
  );
  const loadedDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.estado === "CARGADA"),
    [filteredDeliveries]
  );

  // --- API Callbacks ---
  const handleCreateTrip = async (values: CreateDeliveryFormValues) => {
    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: parseInt(values.order_id),
          truck_id: parseInt(values.truck_id),
          driver_id: parseInt(values.driver_id),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error desconocido del servidor");
      }

      const newDelivery = await res.json();
      toast.success(
        `Nuevo viaje (Despacho #${newDelivery.delivery_id}) creado con éxito.`
      );

      setDeliveries((prev) => [newDelivery, ...prev]);
      createTripForm.reset();
    } catch (err: any) {
      toast.error("Error al crear el viaje", { description: err.message });
    }
  };

  const handleConfirmLoad = async (values: ConfirmLoadFormValues) => {
    if (!selectedDelivery || !user?.id) return;

    try {
      const formData = new FormData();
      formData.append("status", "CARGADA");
      formData.append("notes", values.notes || "");
      formData.append("itemsJson", JSON.stringify(values.loadedItems));
      formData.append("userId", user.id);
      formData.append("photoFile", values.loadPhoto);

      const res = await fetch(
        `/api/deliveries/${selectedDelivery.delivery_id}`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error desconocido");
      }

      const updatedDelivery = await res.json();
      toast.success(`Carga confirmada para ${selectedDelivery.truck.placa}`);

      setDeliveries((prev) =>
        prev.map((d) =>
          d.delivery_id === updatedDelivery.delivery_id ? updatedDelivery : d
        )
      );

      setShowModal(false);
      setSelectedDelivery(null);
    } catch (err: any) {
      toast.error("Error al confirmar la carga", { description: err.message });
    }
  };

  const handleSelectDelivery = useCallback(
    async (delivery: Delivery) => {
      if (delivery.estado !== "PENDING") {
        toast.info("Este despacho ya fue procesado.", {
          description: `Estado actual: ${delivery.estado}`,
        });
        return;
      }

      try {
        const res = await fetch(`/api/deliveries/${delivery.delivery_id}`);
        if (!res.ok) {
          throw new Error(
            "No se pudo obtener la información actualizada del despacho."
          );
        }
        const updatedDelivery: Delivery = await res.json();

        setSelectedDelivery(updatedDelivery);

        const initialLoadedItems =
          updatedDelivery.orderDetails.items?.map((item) => ({
            pedido_item_id: item.id.toString(),
            dispatched_quantity: 0,
          })) || [];

        replaceLoadedItems(initialLoadedItems);
        confirmLoadForm.reset({
          notes: updatedDelivery.notes || "",
          loadedItems: initialLoadedItems,
          loadPhoto: undefined,
        });

        setShowModal(true);
      } catch (error: any) {
        toast.error("Error de red", { description: error.message });
        setSelectedDelivery(delivery); // Fallback to original data
      }
    },
    [confirmLoadForm, replaceLoadedItems]
  );

  useEffect(() => {
    if (!showModal) {
      setSelectedDelivery(null);
      confirmLoadForm.reset();
    }
  }, [showModal, confirmLoadForm]);

  const { isSubmitting: isCreatingTrip } = createTripForm.formState;
  const { isSubmitting: isConfirmingLoad } = confirmLoadForm.formState;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gestión de Patio</h2>

      <Card>
        <CardHeader>
          <CardTitle>Iniciar Nuevo Viaje</CardTitle>
          <CardDescription>
            Selecciona un pedido, camión y conductor para crear un nuevo
            despacho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...createTripForm}>
            <form
              onSubmit={createTripForm.handleSubmit(handleCreateTrip)}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <RHFSearchableSelect
                control={createTripForm.control}
                name="order_id"
                label="Pedido Activo"
                placeholder="Seleccionar Pedido..."
                options={initialActiveOrders.map((o) => ({
                  value: o.id.toString(),
                  label: `#${o.order_number} - ${o.client.name}`,
                }))}
              />
              <RHFSearchableSelect
                control={createTripForm.control}
                name="truck_id"
                label="Camión Disponible"
                placeholder="Seleccionar Camión..."
                options={initialTrucks.map((t) => ({
                  value: t.id.toString(),
                  label: t.placa,
                }))}
              />
              <RHFSearchableSelect
                control={createTripForm.control}
                name="driver_id"
                label="Conductor"
                placeholder="Seleccionar Conductor..."
                options={initialDrivers.map((d) => ({
                  value: d.id.toString(),
                  label: d.name,
                }))}
              />
              <Button type="submit" disabled={isCreatingTrip}>
                {isCreatingTrip ? (
                  "Creando..."
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" /> Crear Viaje
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Buscar por placa, conductor, cliente o ID de despacho..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" /> Pendientes por Cargar{" "}
            <Badge variant="secondary">{pendingDeliveries.length}</Badge>
          </h3>
          {pendingDeliveries.length > 0 ? (
            pendingDeliveries.map((d) => (
              <DeliveryCard
                key={d.delivery_id}
                delivery={d}
                onSelect={handleSelectDelivery}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground pt-4">
              No hay viajes pendientes.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" /> Cargados (Listos
            para Salir){" "}
            <Badge variant="secondary">{loadedDeliveries.length}</Badge>
          </h3>
          {loadedDeliveries.length > 0 ? (
            loadedDeliveries.map((d) => (
              <DeliveryCard
                key={d.delivery_id}
                delivery={d}
                onSelect={() =>
                  toast.info(
                    `El despacho #${d.delivery_id} ya está cargado y listo para salir.`
                  )
                }
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground pt-4">
              No hay viajes cargados.
            </p>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDelivery && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Confirmar Carga: {selectedDelivery.truck.placa}
                </DialogTitle>
                <DialogDescription>
                  Ingresa la cantidad real cargada para cada producto de la
                  orden #{selectedDelivery.orderDetails.order_number}.
                </DialogDescription>
              </DialogHeader>

              <Form {...confirmLoadForm}>
                <form
                  onSubmit={confirmLoadForm.handleSubmit(handleConfirmLoad)}
                  className="space-y-4 py-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <p>
                        <strong>Cliente:</strong>{" "}
                        {selectedDelivery.orderDetails.client.name}
                      </p>
                      <p>
                        <strong>Conductor:</strong>{" "}
                        {selectedDelivery.driver.name}
                      </p>
                    </div>

                    <FormField
                      control={confirmLoadForm.control}
                      name="loadPhoto"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Foto de Carga (Obligatoria)</FormLabel>
                          <FormControl>
                            <PhotoInput
                              onSelect={onChange}
                              required={true}
                              label="Foto de Carga (Obligatoria)"
                              capture={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Items del Pedido</Label>
                    <div className="border rounded-lg">
                      {loadedItemsFields.map((field, index) => {
                        const item = selectedDelivery.orderDetails.items[index];
                        if (!item) return null;

                        const totalOrdered = item.quantity;
                        const totalDispatchedPreviously =
                          selectedDelivery.totalDispatched ?? 0;
                        const pendingQuantity = Math.max(
                          0,
                          totalOrdered - totalDispatchedPreviously
                        );

                        return (
                          <div
                            key={field.id}
                            className={`p-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-center ${
                              index > 0 ? "border-t" : ""
                            }`}
                          >
                            <div className="col-span-1 md:col-span-1 space-y-1">
                              <p className="font-medium">{item.product.name}</p>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  Pedido:{" "}
                                  <span className="font-bold">
                                    {totalOrdered.toFixed(2)}
                                  </span>{" "}
                                  {item.product.unit}
                                </p>
                                <p>
                                  Despachado:{" "}
                                  <span className="font-bold text-blue-600">
                                    {totalDispatchedPreviously.toFixed(2)}
                                  </span>{" "}
                                  {item.product.unit}
                                </p>
                                <p>
                                  Pendiente:{" "}
                                  <span className="font-bold text-green-600">
                                    {pendingQuantity.toFixed(2)}
                                  </span>{" "}
                                  {item.product.unit}
                                </p>
                              </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <FormField
                                control={confirmLoadForm.control}
                                name={`loadedItems.${index}.dispatched_quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel
                                      htmlFor={`item-${item.id}`}
                                      className="text-xs mb-1"
                                    >
                                      Cantidad a Cargar en este Viaje *
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        id={`item-${item.id}`}
                                        type="number"
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        max={pendingQuantity}
                                        min={0}
                                        required
                                        className="text-lg"
                                        disabled={pendingQuantity <= 0}
                                      />
                                    </FormControl>
                                    {pendingQuantity <= 0 && (
                                      <p className="text-xs text-green-700 mt-1">
                                        Este item ya fue despachado por
                                        completo.
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {confirmLoadForm.formState.errors.loadedItems && (
                      <p className="text-sm font-medium text-destructive">
                        {confirmLoadForm.formState.errors.loadedItems.message ||
                          confirmLoadForm.formState.errors.loadedItems.root
                            ?.message}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={confirmLoadForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Observaciones de la carga..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isConfirmingLoad}>
                      {isConfirmingLoad ? "Procesando..." : "Confirmar Carga"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
