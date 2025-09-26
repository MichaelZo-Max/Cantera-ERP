"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import { Search, DollarSign, User, Calendar, ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react";
import type { CashierOrder, Invoice } from "@/lib/types";


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
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- Estados para el Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CashierOrder | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);


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
  
  // --- Efecto para buscar facturas cuando se abre el modal ---
  useEffect(() => {
    if (selectedOrder) {
      const fetchInvoices = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/invoices?customerId=${selectedOrder.customer_id}`);
          if (!response.ok) throw new Error("Error al cargar facturas");
          
          const responseData = await response.json();
          
          // --- ✨ SOLUCIÓN AL PROBLEMA ---
          // Se asegura de que lo que se guarda en el estado sea siempre un array.
          // Si la API devuelve { data: [...] }, tomará `responseData.data`.
          // Si la API devuelve [...], tomará `responseData`.
          const invoicesArray = Array.isArray(responseData) ? responseData : responseData.data || [];
          setInvoices(invoicesArray);

        } catch (error) {
          toast.error("No se pudieron cargar las facturas del cliente.");
          setInvoices([]); // Asegurarse de limpiar en caso de error
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoices();
    }
  }, [selectedOrder]);

  const handleOpenModal = (order: CashierOrder) => {
    if (order.status !== 'PENDING_INVOICE') return;
    setSelectedOrder(order);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setInvoices([]);
    setSelectedInvoiceId("");
  };
  
  // --- Manejador para facturar la orden ---
  const handleInvoiceOrder = async () => {
    if (!selectedOrder || !selectedInvoiceId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cashier-orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: selectedInvoiceId }),
      });
      
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || "Error al actualizar la orden");
      }
      
      toast.success("¡Orden facturada exitosamente!");
      router.refresh(); // Refresca los datos de la página
      handleCloseModal();

    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    } finally {
       setIsLoading(false);
    }
  };


  return (
    <div className="space-y-4 motion-safe:animate-fade-in">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, número de orden o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 text-base sm:text-lg"
            />
          </div>
        </CardContent>
      </Card>

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
                onClick={() => handleOpenModal(order)}
                className={order.status === 'PENDING_INVOICE' ? 'cursor-pointer' : ''}
              >
                <Card className="flex h-full flex-col bg-transparent border-0 shadow-none">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">{order.order_number}</CardTitle>
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
                icon={<ClipboardList className="h-12 w-12" />}
                title="No se encontraron órdenes de caja"
                description={searchTerm ? "Intenta con otros términos de búsqueda." : "Aún no hay órdenes de caja registradas."}
              />
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* --- Modal para Facturar --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleCloseModal}>
          <DialogHeader>
            <DialogTitle>Asociar Factura a la Orden</DialogTitle>
            <DialogDescription>
              Selecciona una factura existente para marcar la orden <strong>{selectedOrder?.order_number}</strong> como facturada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {isLoading && !invoices.length ? (
                <div className="flex items-center justify-center h-24">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="invoice-select">Facturas del Cliente</Label>
                    <Select
                        value={selectedInvoiceId}
                        onValueChange={setSelectedInvoiceId}
                        disabled={isLoading || invoices.length === 0}
                    >
                        <SelectTrigger id="invoice-select">
                            <SelectValue placeholder={invoices.length > 0 ? "Selecciona una factura..." : "No hay facturas para este cliente"} />
                        </SelectTrigger>
                        <SelectContent>
                            {/* --- ✨ SOLUCIÓN AL PROBLEMA (2a parte) --- */}
                            {/* Ahora nos aseguramos que invoices es un array antes de mapear */}
                            {Array.isArray(invoices) && invoices.map((invoice) => (
                                <SelectItem key={invoice.invoice_n} value={invoice.invoice_n}>
                                    {invoice.invoice_full_number || invoice.invoice_n} - {new Intl.NumberFormat("en-US", { style: 'currency', currency: 'USD' }).format(invoice.total_usd)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseModal} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleInvoiceOrder}
              disabled={isLoading || !selectedInvoiceId}
            >
              {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Confirmar y Facturar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}