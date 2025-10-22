"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import * as z from "zod";

import type {
  Delivery as BaseDelivery,
  Order,
  Truck as TruckType,
  Driver,
  Invoice,
  OrderItem,
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
  type SearchableSelectOption,
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
  FileText,
  Truck as TruckIcon,
  Search,
  Package,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

// --- Zod Schemas (Sin cambios) ---
const createDeliverySchema = z.object({
  order_id: z.string().min(1, "Debes seleccionar un pedido."),
  truck_id: z.string().min(1, "Debes seleccionar un camión."),
  driver_id: z.string().min(1, "Debes seleccionar un conductor."),
});
const confirmLoadSchema = z.object({
  notes: z.string().optional(),
  loadPhoto: z.any().optional(),
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

// --- Type Definitions (Sin cambios) ---
type CreateDeliveryFormValues = z.infer<typeof createDeliverySchema>;
type ConfirmLoadFormValues = z.infer<typeof confirmLoadSchema>;
type Delivery = BaseDelivery;
interface YardClientProps {
  initialDeliveries: Delivery[];
  initialActiveOrders: Order[];
}

// --- 👇 CORRECCIÓN: Tipo local para el item del despacho ---
type DeliveryItem = {
  quantity: number;
  totalDispatched?: number;
};
// --- RHFSearchableSelect (Sin cambios) ---
const RHFSearchableSelect = ({
  control,
  name,
  label,
  options,
  placeholder,
  disabled,
  className,
  loading,
}: any) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>{label}</FormLabel>
        <div className="relative flex items-center">
          <SearchableSelect
            value={field.value}
            onChange={field.onChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled || loading}
            className="w-full"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <FormMessage />
      </FormItem>
    )}
  />
);

// --- Delivery Card Component ---
const DeliveryCard = React.memo(
  ({
    delivery,
    onSelect,
  }: {
    delivery: Delivery;
    onSelect: (delivery: Delivery) => void;
  }) => {
    const [imageError, setImageError] = useState(false);

    return (
      <AnimatedCard
        className="cursor-pointer hover:border-primary transition-all"
        onClick={() => onSelect(delivery)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg flex items-center gap-2">
                <TruckIcon className="h-5 w-5" /> {delivery.truck.placa}
              </p>
              <p className="text-sm text-muted-foreground">
                Despacho ID: {delivery.id}
              </p>
            </div>
            <Badge
              variant={delivery.status === "CARGADA" ? "default" : "secondary"}
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
          {delivery.orderDetails.invoices &&
            delivery.orderDetails.invoices.length > 0 && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Factura(s):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {delivery.orderDetails.invoices.map((invoice: Invoice) => (
                      <Badge
                        key={invoice.invoice_full_number}
                        variant="secondary"
                        className="text-xs"
                      >
                        {invoice.invoice_full_number}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Cliente:</span>
            <span className="truncate">
              {delivery.orderDetails.client.name}
            </span>
          </div>

          {delivery.loadPhoto ? (
            imageError ? (
              <div className="h-40 w-full rounded-md border border-dashed border-destructive/50 bg-destructive/5 flex flex-col items-center justify-center text-center text-destructive p-2 mt-2">
                <AlertTriangle className="h-6 w-6 mb-1" />
                <p className="text-xs font-medium">Error al cargar la foto</p>
              </div>
            ) : (
              <div className="relative h-40 w-full overflow-hidden rounded-md border group mt-2">
                <Image
                  src={delivery.loadPhoto}
                  alt={`Foto de carga`}
                  fill
                  style={{ objectFit: "cover" }}
                  className="transition-transform duration-300 group-hover:scale-105"
                  onError={() => setImageError(true)}
                />
              </div>
            )
          ) : delivery.status === "CARGADA" ? (
            <div className="h-40 w-full rounded-md border border-dashed bg-muted/20 flex flex-col items-center justify-center text-center text-muted-foreground p-2 mt-2">
              <Package className="h-8 w-8" />
              <p className="text-xs font-medium mt-2">Sin foto de carga</p>
            </div>
          ) : null}
        </CardContent>
      </AnimatedCard>
    );
  }
);
DeliveryCard.displayName = "DeliveryCard";

export function YardDeliveriesClientUI({
  initialDeliveries,
  initialActiveOrders,
}: YardClientProps) {
  const { user } = useAuth();

  // --- State Management ---
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [activeOrders, setActiveOrders] =
    useState<Order[]>(initialActiveOrders);

  const [showModal, setShowModal] = useState(false);

  const [authorizedTrucks, setAuthorizedTrucks] = useState<TruckType[]>([]);
  const [authorizedDrivers, setAuthorizedDrivers] = useState<Driver[]>([]);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);

  // --- React Hook Form Instances ---
  const createTripForm = useForm<CreateDeliveryFormValues>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: { order_id: "", truck_id: "", driver_id: "" },
  });

  const confirmLoadForm = useForm<ConfirmLoadFormValues>({
    resolver: zodResolver(confirmLoadSchema),
    defaultValues: { notes: "", loadedItems: [] },
  });

  const { fields: loadedItemsFields, replace: replaceLoadedItems } =
    useFieldArray({
      control: confirmLoadForm.control,
      name: "loadedItems",
    });

  // --- Lógica de Fetching para Transporte Autorizado ---
  const selectedOrderId = useWatch({
    control: createTripForm.control,
    name: "order_id",
  });

  useEffect(() => {
    const fetchAuthorizedTransport = async (orderId: string) => {
      if (!orderId) {
        setAuthorizedTrucks([]);
        setAuthorizedDrivers([]);
        return;
      }

      setIsLoadingTransport(true);
      createTripForm.setValue("truck_id", "");
      createTripForm.setValue("driver_id", "");

      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok)
          throw new Error("No se pudo cargar el transporte autorizado.");
        const data = await res.json();
        setAuthorizedTrucks(data.trucks || []);
        setAuthorizedDrivers(data.drivers || []);
      } catch (error: any) {
        toast.error("Error al cargar datos", { description: error.message });
        setAuthorizedTrucks([]);
        setAuthorizedDrivers([]);
      } finally {
        setIsLoadingTransport(false);
      }
    };

    fetchAuthorizedTransport(selectedOrderId);
  }, [selectedOrderId, createTripForm]);

  // --- Derived State (Memoized) ---
  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(
      (d) =>
        (d.truck.placa?.toLowerCase() ?? "").includes(query) ||
        (d.driver.name?.toLowerCase() ?? "").includes(query) ||
        (d.orderDetails.client.name?.toLowerCase() ?? "").includes(query) ||
        (d.id.toString() ?? "").includes(query) ||
        d.orderDetails.invoices?.some((invoice) =>
          invoice.invoice_full_number?.toLowerCase().includes(query)
        )
    );
  }, [searchQuery, deliveries]);

  const pendingDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.status === "PENDING"),
    [filteredDeliveries]
  );
  const loadedDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.status === "CARGADA"),
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
        `Nuevo viaje (Despacho #${newDelivery.id}) creado con éxito.`
      );

      setDeliveries((prev) => [newDelivery, ...prev]);
      // 👇 LA LÓGICA CLAVE: Actualiza el estado de los pedidos activos en el cliente.
      setActiveOrders((prev) =>
        prev.filter((order) => order.id.toString() !== values.order_id)
      );

      createTripForm.reset();
      setAuthorizedDrivers([]);
      setAuthorizedTrucks([]);
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
      formData.append("userId", user.id.toString());
      if (values.loadPhoto) {
        formData.append("photoFile", values.loadPhoto);
      }

      const res = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error desconocido");
      }

      const updatedDelivery = await res.json();
      toast.success(`Carga confirmada para ${selectedDelivery.truck.placa}`);

      setDeliveries((prev) =>
        prev.map((d) => (d.id === updatedDelivery.id ? updatedDelivery : d))
      );

      // --- 👇 CORRECCIÓN: Lógica para actualizar la lista de pedidos activos ---
      // Después de confirmar una carga, recalculamos si el pedido debe seguir activo o no.
      const orderDetails = updatedDelivery.orderDetails;

      // Verificamos si el pedido está completamente despachado.
      // El backend ya nos devuelve el estado actualizado del pedido ('DISPATCHED_COMPLETE' si está terminado).
      const isOrderComplete = orderDetails.status === "DISPATCHED_COMPLETE";

      if (isOrderComplete) {
        // Si el pedido está completo, lo eliminamos de la lista de activos para que no se puedan crear más viajes.
        setActiveOrders((prev) => prev.filter((o) => o.id !== orderDetails.id));
      } else {
        // Si el pedido NO está completo (es decir, es 'PARTIALLY_DISPATCHED'),
        // lo añadimos de nuevo a la lista de activos si no está ya presente, para permitir más viajes.
        // Esto maneja los casos de despachos parciales.
        setActiveOrders((prev) => {
          if (!prev.some((o) => o.id === orderDetails.id)) {
            return [...prev, orderDetails];
          }
          // --- CORRECCIÓN: Actualizar el pedido si ya existe en la lista ---
          // Esto asegura que si el pedido ya estaba, se actualice con la nueva información
          // (ej. el estado 'PARTIALLY_DISPATCHED').
          return prev.map((o) => (o.id === orderDetails.id ? orderDetails : o));
        });
      }

      setShowModal(false);
      setSelectedDelivery(null);
    } catch (err: any) {
      toast.error("Error al confirmar la carga", { description: err.message });
    }
  };

  const handleSelectDelivery = useCallback(
    async (delivery: Delivery) => {
      if (delivery.status !== "PENDING") {
        toast.info("Este despacho ya fue procesado.", {
          description: `Estado actual: ${delivery.status}`,
        });
        return;
      }

      try {
        const res = await fetch(`/api/deliveries/${delivery.id}`);
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
        setSelectedDelivery(delivery); // Fallback
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Columna Izquierda: Formularios y Búsqueda */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
        <AnimatedCard>
          <CardHeader>
            <CardTitle>Iniciar Nuevo Viaje</CardTitle>
            <CardDescription>
              Crea un nuevo despacho asociando un pedido, camión y conductor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...createTripForm}>
              <form
                onSubmit={createTripForm.handleSubmit(handleCreateTrip)}
                className="space-y-4"
              >
                <RHFSearchableSelect
                  control={createTripForm.control}
                  name="order_id"
                  label="1. Pedido Activo"
                  placeholder="Seleccionar Pedido..."
                  options={activeOrders.map((o) => ({
                    value: o.id.toString(),
                    label: `#${o.order_number} - ${o.client.name}`,
                  }))}
                />
                <RHFSearchableSelect
                  control={createTripForm.control}
                  name="truck_id"
                  label="2. Camión Autorizado"
                  placeholder="Seleccionar Camión..."
                  options={authorizedTrucks.map((t) => ({
                    value: t.id.toString(),
                    label: t.placa,
                  }))}
                  disabled={!selectedOrderId || isLoadingTransport}
                  loading={isLoadingTransport}
                />
                <RHFSearchableSelect
                  control={createTripForm.control}
                  name="driver_id"
                  label="3. Conductor Autorizado"
                  placeholder="Seleccionar Conductor..."
                  options={authorizedDrivers.map((d) => ({
                    value: d.id.toString(),
                    label: d.name,
                  }))}
                  disabled={!selectedOrderId || isLoadingTransport}
                  loading={isLoadingTransport}
                />
                <GradientButton
                  type="submit"
                  disabled={isCreatingTrip}
                  className="w-full"
                >
                  {isCreatingTrip ? (
                    "Creando..."
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Crear Viaje
                    </>
                  )}
                </GradientButton>
              </form>
            </Form>
          </CardContent>
        </AnimatedCard>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, cliente, factura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columna Derecha: Listas de Despachos */}
      <div className="lg:col-span-2 space-y-6">
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" /> Pendientes por Cargar
              <Badge variant="secondary">{pendingDeliveries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDeliveries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDeliveries.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onSelect={handleSelectDelivery}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No hay viajes pendientes"
                description="Crea un nuevo viaje para que aparezca aquí."
                icon={<TruckIcon className="h-10 w-10" />}
              />
            )}
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> Cargados
              (Listos para Salir)
              <Badge variant="secondary">{loadedDeliveries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadedDeliveries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadedDeliveries.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onSelect={() =>
                      toast.info(
                        `El despacho #${d.id} ya está cargado y listo para salir.`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No hay viajes cargados"
                description="Confirma la carga de un viaje pendiente para que aparezca en esta sección."
                icon={<Package className="h-10 w-10" />}
              />
            )}
          </CardContent>
        </AnimatedCard>
      </div>
      {/* Modal de Confirmación de Carga */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
                  className="space-y-6 py-2"
                >
                  <FormField
                    control={confirmLoadForm.control}
                    name="loadPhoto"
                    render={({ field: { onChange } }) => (
                      <FormItem>
                        <FormLabel>Foto de Carga (Opcional)</FormLabel>
                        <FormControl>
                          <PhotoInput
                            onSelect={onChange}
                            required={false}
                            label="Tocar para tomar o seleccionar foto"
                            capture={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-3 border rounded-lg text-sm space-y-2">
                    <p>
                      <strong>Cliente:</strong>{" "}
                      {selectedDelivery.orderDetails.client.name}
                    </p>
                    <p>
                      <strong>Conductor:</strong> {selectedDelivery.driver.name}
                    </p>
                    <p>
                      <strong>Camión:</strong> {selectedDelivery.truck.placa}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Items del Pedido</Label>
                    <div className="border rounded-lg">
                      {loadedItemsFields.map((field, index) => {
                        const item = selectedDelivery.orderDetails.items[index];
                        if (!item) return null;

                        const totalOrdered = item.quantity;
                        const totalDispatchedPreviously =
                          item.totalDispatched ?? 0;

                        const pendingQuantity = Math.max(
                          0,
                          totalOrdered - totalDispatchedPreviously
                        );

                        return (
                          <div
                            key={field.id}
                            className={cn(
                              "p-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-center",
                              index > 0 && "border-t"
                            )}
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
