// app/(protected)/cashier/orders/list/orders-list-client.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types";
import { Search, Eye, FileText, Calendar, User } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";

export function OrdersListClientUI({ initialOrders }: { initialOrders: Order[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders] = useState<Order[]>(initialOrders);

  const filteredOrders = orders.filter((order) => {
    const q = searchTerm.toLowerCase();
    const orderNumber = order.orderNumber?.toLowerCase() ?? "";
    const clientName = order.client?.nombre?.toLowerCase() ?? "";
    return orderNumber.includes(q) || clientName.includes(q);
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "CREADA":
        return { label: "Creada", color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800" };
      case "PAGADA":
        return { label: "Pagada", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" };
      case "EN_DESPACHO":
        return { label: "En Despacho", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" };
      case "CERRADA":
        return { label: "Cerrada", color: "bg-muted text-muted-foreground border-border" };
      case "CANCELADA":
        return { label: "Cancelada", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" };
      default:
        return { label: status, color: "bg-muted text-muted-foreground border-border" };
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Consulta y gestiona los pedidos existentes"
        actions={
          <Button asChild>
            <Link href="/cashier/orders" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Nuevo Pedido</span>
            </Link>
          </Button>
        }
      />

      <AnimatedCard>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por número de pedido o cliente…"
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
          description={searchTerm ? "Intenta con otros términos de búsqueda." : "Crea un nuevo pedido para comenzar."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => {
            const createdAt = new Date(order.createdAt as unknown as string);
            const statusConfig = getStatusConfig(order.estado);
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
                    <div>
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {order.orderNumber}
                      </CardTitle>
                    </div>
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.client?.nombre}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{createdAt.toLocaleDateString("es-VE", {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}</span>
                  </div>
                  {order.notes && (
                    <div className="mt-2 p-2 bg-muted/30 rounded-md text-xs text-muted-foreground">
                      <strong>Notas:</strong> {order.notes}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t flex justify-between items-center">
                  <p className="text-xl font-bold text-foreground">${Number(order.total ?? 0).toFixed(2)}</p>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-transparent">
                    <Eye className="h-4 w-4" />
                    <span>Ver Detalles</span>
                  </Button>
                </CardFooter>
              </AnimatedCard>
            );
          })}
        </div>
      )}
    </div>
  );
}