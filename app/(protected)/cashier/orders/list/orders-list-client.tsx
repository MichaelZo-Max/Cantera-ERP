"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  Order,
  OrderProgress,
  OrderItem,
  DeliveryItem,
  Invoice,
} from "@/lib/types";
import {
  Search,
  FileText,
  Calendar,
  User,
  Truck,
  Package,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
// --- 👇 MEJORA: Importaciones necesarias para el Tooltip ---
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- (Función getStatusConfig sin cambios) ---
const getStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING_INVOICE":
      return {
        label: "Esperando Pago",
        color:
          "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
      };
    case "INVOICED":
      return {
        label: "Pagada",
        color:
          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      };
    case "PARTIALLY_DISPATCHED":
      return {
        label: "Despacho Parcial",
        color:
          "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
      };
    case "DISPATCHED_COMPLETE":
      return {
        label: "Completada",
        color:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      };
    case "CANCELLED":
      return {
        label: "Cancelada",
        color:
          "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      };
    default:
      return {
        label: status,
        color: "bg-muted text-muted-foreground border-border",
      };
  }
};

// --- (Función calculateOrderProgress sin cambios) ---
const calculateOrderProgress = (order: Order): OrderProgress => {
  const totalItems =
    order.items?.reduce(
      (sum: number, item: OrderItem) => sum + item.quantity,
      0
    ) || 0;

  const dispatchedItems =
    order.items?.reduce((sum: number, item: OrderItem) => {
      const itemDispatched =
        item.dispatchItems?.reduce(
          (dispatchSum: number, dispatch: DeliveryItem) =>
            dispatchSum + dispatch.dispatched_quantity,
          0
        ) || 0;
      return sum + itemDispatched;
    }, 0) || 0;

  const completedTrips =
    order.deliveries?.filter((d) => d.estado === "EXITED").length || 0;
  const totalTrips = order.deliveries?.length || 0;
  return {
    order_id: String(order.id),
    totalItems,
    dispatchedItems,
    pendingItems: totalItems - dispatchedItems,
    completedTrips,
    totalTrips,
    status: order.status,
  };
};

export function OrdersListClientUI({
  initialOrders,
}: {
  initialOrders: Order[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return initialOrders;
    const q = searchTerm.toLowerCase();
    return initialOrders.filter(
      (order) =>
        (order.order_number?.toLowerCase() ?? "").includes(q) ||
        (order.client?.name?.toLowerCase() ?? "").includes(q) ||
        order.invoices?.some((invoice) =>
          invoice.invoice_full_number?.toLowerCase().includes(q)
        )
    );
  }, [initialOrders, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Consulta y gestiona los pedidos"
        actions={
          <Button asChild>
            <Link href="/cashier/orders">
              <FileText className="h-4 w-4 mr-2" />
              <span>Nuevo Pedido</span>
            </Link>
          </Button>
        }
      />

      <AnimatedCard>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por orden, cliente o factura…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No se encontraron pedidos"
          description={
            searchTerm
              ? "Intenta con otros términos de búsqueda."
              : "Crea un nuevo pedido para comenzar."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => {
            const statusConfig = getStatusConfig(order.status);
            const progress = calculateOrderProgress(order);
            const progressPercentage =
              progress.totalItems > 0
                ? (progress.dispatchedItems / progress.totalItems) * 100
                : 0;

            // --- 👇 LÓGICA: Determina si el botón de edición debe estar deshabilitado ---
            const isEditingDisabled =
              order.status === "PARTIALLY_DISPATCHED" ||
              order.status === "DISPATCHED_COMPLETE";

            return (
              <AnimatedCard
                key={order.id}
                hoverEffect="lift"
                animateIn
                delay={index * 50}
                className="flex flex-col"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {order.order_number}
                    </CardTitle>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />{" "}
                    <span className="font-medium">{order.client?.name}</span>
                  </div>

                  {order.invoices && order.invoices.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {order.invoices.map((invoice: Invoice) => (
                          <Badge
                            key={invoice.invoice_full_number}
                            variant="secondary"
                          >
                            {invoice.invoice_full_number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />{" "}
                    <span>
                      {new Date(order.created_at).toLocaleDateString("es-VE")}
                    </span>
                  </div>

                  {progress.totalTrips > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1.5">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span>Viajes:</span>
                        </div>
                        <span className="font-medium">
                          {progress.completedTrips}/{progress.totalTrips}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1.5">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>Despachado:</span>
                        </div>
                        <span className="font-medium">
                          {progress.dispatchedItems.toFixed(1)}/
                          {progress.totalItems.toFixed(1)}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t flex justify-between items-center">
                  <p className="text-xl font-bold">
                    ${Number(order.total ?? 0).toFixed(2)}
                  </p>

                  {/* --- 👇 MEJORA: Botón de editar con Tooltip y lógica de deshabilitación --- */}
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Envolvemos el Link en un div para que el tooltip funcione incluso si el botón está deshabilitado */}
                        <div className="relative">
                          <Link
                            href={`/cashier/orders/${order.id}`}
                            // Deshabilitamos el clic en el enlace con CSS si está deshabilitado
                            className={
                              isEditingDisabled ? "pointer-events-none" : ""
                            }
                            tabIndex={isEditingDisabled ? -1 : undefined}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isEditingDisabled}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </TooltipTrigger>
                      {isEditingDisabled && (
                        <TooltipContent>
                          <p>
                            No se puede editar una orden con despachos
                            iniciados.
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </AnimatedCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
