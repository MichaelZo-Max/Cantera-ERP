// app/(protected)/cashier/deliveries/deliveries-client.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Truck,
  Clock,
  CheckCircle,
  Package,
  FileText, // <-- Importa el ícono de factura
  Eye,
  ChevronDown,
} from "lucide-react";
import type { Delivery } from "@/lib/types";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/* ----------------------------- Config de estado ----------------------------- */
const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    color:
      "bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-800",
    icon: Clock,
  },
  CARGADA: {
    label: "Cargada en Patio",
    color:
      "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
    icon: Package,
  },
  EXITED: {
    label: "Despachado",
    color:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function StatusBadge({ estado }: { estado: string }) {
  const conf = STATUS_CONFIG[estado as StatusKey] ?? STATUS_CONFIG.PENDING;
  const Icon = conf.icon;
  return (
    <Badge className={`text-xs ${conf.color}`}>
      <Icon className="mr-1 h-3 w-3" />
      {conf.label}
    </Badge>
  );
}

/* --------------------------------- Componente -------------------------------- */
export function CashierDeliveriesClientUI({
  initialDeliveries,
}: {
  initialDeliveries: Delivery[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  /* Filtrado por búsqueda (placa, cliente, nro orden, factura, id viaje) */
  const filteredDeliveries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return initialDeliveries;
    return initialDeliveries.filter((delivery) => {
      const placa = delivery.truck?.placa?.toLowerCase() ?? "";
      const cliente = delivery.orderDetails.client?.name?.toLowerCase() ?? "";
      const orderNumber = delivery.orderDetails.order_number?.toLowerCase() ?? "";
      // --- INICIO: CÓDIGO A AGREGAR ---
      const invoiceNumber = delivery.orderDetails.invoice_full_number?.toLowerCase() ?? "";
      // --- FIN: CÓDIGO A AGREGAR ---
      const id = String(delivery.delivery_id).toLowerCase();
      
      return (
        placa.includes(q) ||
        cliente.includes(q) ||
        id.includes(q) ||
        orderNumber.includes(q) ||
        // --- INICIO: CÓDIGO A AGREGAR ---
        invoiceNumber.includes(q)
        // --- FIN: CÓDIGO A AGREGAR ---
      );
    });
  }, [initialDeliveries, searchTerm]);

  /* Agrupar por orden */
  const deliveriesByOrder = useMemo(() => {
    const grouped = new Map<string, Delivery[]>();
    for (const d of filteredDeliveries) {
      const order_id = String(d.orderDetails.id);
      if (!grouped.has(order_id)) grouped.set(order_id, []);
      grouped.get(order_id)!.push(d);
    }
    // Ordenar cada grupo por ID de viaje
    for (const [, arr] of grouped) {
      arr.sort((a, b) => a.delivery_id - b.delivery_id);
    }
    return grouped;
  }, [filteredDeliveries]);

  /* Contadores (según lo filtrado para coherencia visual) */
  const completedDeliveriesCount = useMemo(
    () => filteredDeliveries.filter((d) => d.estado === "EXITED").length,
    [filteredDeliveries]
  );
  const inProgressDeliveriesCount =
    filteredDeliveries.length - completedDeliveriesCount;

  return (
    <div className="space-y-6 sm:space-y-8 motion-safe:animate-fade-in">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Seguimiento de Despachos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Monitorea el estado de múltiples viajes por orden
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>
              <span className="font-medium text-foreground">
                {completedDeliveriesCount}
              </span>{" "}
              Completados
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span>
              <span className="font-medium text-foreground">
                {inProgressDeliveriesCount}
              </span>{" "}
              En proceso
            </span>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift">
        <CardContent className="pt-6">
          <div className="relative">
            <label htmlFor="search-deliveries" className="sr-only">
              Buscar despachos por placa, cliente, orden o ID de viaje
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="search-deliveries"
              // --- INICIO: TEXTO ACTUALIZADO ---
              placeholder="Buscar por placa, cliente, orden, factura o ID de viaje…"
              // --- FIN: TEXTO ACTUALIZADO ---
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 text-base sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              inputMode="search"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Listado por Orden */}
      <section className="space-y-4 sm:space-y-6">
        {Array.from(deliveriesByOrder.entries()).length > 0 ? (
          Array.from(deliveriesByOrder.entries()).map(
            ([order_id, orderDeliveries], orderIndex) => {
              const firstDelivery = orderDeliveries[0];
              const completedTrips = orderDeliveries.filter(
                (d) => d.estado === "EXITED"
              ).length;
              const orderNumber = firstDelivery.orderDetails.order_number || order_id;
              const clientName = firstDelivery.orderDetails.client?.name || "N/A";
              const invoiceFullNumber = firstDelivery.orderDetails.invoice_full_number;

              return (
                <Collapsible key={order_id} defaultOpen>
                  <AnimatedCard
                    hoverEffect="lift"
                    animateIn
                    delay={orderIndex * 80}
                    className="overflow-hidden"
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader
                        role="button"
                        className="group cursor-pointer p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="truncate text-lg font-semibold sm:text-xl">
                              Orden {orderNumber}
                            </CardTitle>
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {clientName}
                            </p>
                            {/* --- INICIO: CÓDIGO A AGREGAR --- */}
                            {invoiceFullNumber && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span>{invoiceFullNumber}</span>
                              </div>
                            )}
                            {/* --- FIN: CÓDIGO A AGREGAR --- */}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="p-4">
                        <div
                          className="
                            grid gap-4
                            grid-cols-1
                            sm:grid-cols-2
                            lg:grid-cols-3
                            xl:grid-cols-4
                          "
                        >
                          {orderDeliveries.map((delivery) => {
                            const hasItemsLoaded =
                              (delivery.dispatchItems?.length ?? 0) > 0;

                            return (
                              <Card
                                key={delivery.delivery_id}
                                className="flex h-full flex-col border-2"
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-semibold">
                                        Viaje #{delivery.delivery_id}
                                      </span>
                                    </div>
                                    <StatusBadge estado={delivery.estado} />
                                  </div>

                                  <p className="pt-1 text-sm font-medium">
                                    {delivery.truck?.placa || "N/A"}
                                  </p>
                                </CardHeader>

                                <CardContent className="flex grow flex-col gap-2 pt-2 pb-4">
                                  {hasItemsLoaded ? (
                                    <div className="rounded-lg bg-muted/50 p-2">
                                      <ul className="space-y-2">
                                        {delivery.dispatchItems!.map(
                                          (item, idx) => (
                                            <li
                                              key={`${delivery.delivery_id}-${idx}`}
                                              className="flex items-center justify-between text-xs"
                                            >
                                              <span className="truncate pr-2 text-muted-foreground">
                                                {item.orderItem?.product
                                                  ?.name ||
                                                  "Producto desconocido"}
                                              </span>
                                              <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                                                {(
                                                  item.dispatched_quantity ?? 0
                                                ).toFixed(2)}
                                              </span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="py-2 text-center text-xs italic text-muted-foreground">
                                      Pendiente por cargar
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </AnimatedCard>
                </Collapsible>
              );
            }
          )
        ) : (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<Truck className="h-12 w-12" aria-hidden="true" />}
                title="No se encontraron despachos"
                description={
                  searchTerm
                    ? "Intenta con otros términos de búsqueda."
                    : "Aún no hay despachos registrados."
                }
              />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}