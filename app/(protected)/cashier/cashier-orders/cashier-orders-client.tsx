"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, DollarSign, User, Calendar, ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react";
import type { CashierOrder } from "@/lib/types";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/* ----------------------------- Configuración de Estado ----------------------------- */
const STATUS_CONFIG = {
  PENDING_INVOICE: {
    label: "Pendiente de Facturar",
    color: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  INVOICED: {
    label: "Facturado",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800",
    icon: XCircle,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

// Componente para el badge de estado, adaptado a esta vista
function OrderStatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.PENDING_INVOICE;
  const Icon = conf.icon;
  return (
    <Badge className={`text-xs ${conf.color}`}>
      <Icon className="mr-1 h-3 w-3" />
      {conf.label}
    </Badge>
  );
}

/* --------------------------------- Componente Principal -------------------------------- */
export function CashierOrdersClient({ data }: { data: CashierOrder[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrado por búsqueda (número de orden, cliente o ID)
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter((order) => {
      const orderNumber = order.order_number?.toLowerCase() ?? "";
      const customerName = order.customer_name?.toLowerCase() ?? "";
      const id = String(order.id).toLowerCase();

      return (
        orderNumber.includes(q) ||
        customerName.includes(q) ||
        id.includes(q)
      );
    });
  }, [data, searchTerm]);

  return (
    <div className="space-y-6 sm:space-y-8 motion-safe:animate-fade-in">
      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift">
        <CardContent className="pt-6">
          <div className="relative">
            <label htmlFor="search-orders" className="sr-only">
              Buscar órdenes de caja
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="search-orders"
              placeholder="Buscar por cliente, número de orden o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 text-base sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              inputMode="search"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Listado de Tarjetas */}
      <section>
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order, index) => (
              <AnimatedCard
                key={order.id}
                hoverEffect="lift"
                animateIn
                delay={index * 50}
              >
                <Card className="flex h-full flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">
                                {order.order_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <DollarSign className="mr-2 h-4 w-4" />
                            <span className="font-semibold text-foreground">
                                {new Intl.NumberFormat("en-US", { style: 'currency', currency: 'USD' }).format(order.total_usd)}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Creado por: {order.created_by_name}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>{format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<ClipboardList className="h-12 w-12" aria-hidden="true" />}
                title="No se encontraron órdenes de caja"
                description={
                  searchTerm
                    ? "Intenta con otros términos de búsqueda."
                    : "Aún no hay órdenes de caja registradas."
                }
              />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}