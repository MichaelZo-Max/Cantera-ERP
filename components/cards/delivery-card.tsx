"use client";

import { useMemo } from "react";
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  Eye,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle, // Importado para el título
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Delivery } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

interface DeliveryCardProps {
  delivery: Delivery;
  // Simplificamos las props, ya que la navegación se maneja con Link
}

// Mapeo de estados alineado con lib/types.ts y el resto de la app
const getStatusConfig = (status: Delivery["status"]) => {
  const s = status?.toUpperCase() ?? "PENDING";
  switch (s) {
    case "PENDING":
      return {
        label: "Pendiente",
        color:
          "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200",
        icon: Clock,
      };
    case "CARGADA":
      return {
        label: "Cargada en Patio",
        color:
          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300",
        icon: Package,
      };
    case "EXITED":
      return {
        label: "Salió de Planta",
        color:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300",
        icon: CheckCircle,
      };
    default:
      return {
        label: "Desconocido",
        color: "bg-muted text-muted-foreground",
        icon: Clock,
      };
  }
};

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  const statusConfig = getStatusConfig(delivery.status);
  const StatusIcon = statusConfig.icon;

  // Calculamos la cantidad total despachada para ESTE viaje específico.
  // Esta es la lógica clave que soluciona tu problema.
  const totalDispatchedQuantity = useMemo(() => {
    if (!delivery.dispatchItems || delivery.dispatchItems.length === 0) {
      return 0;
    }
    // Sumamos la `dispatched_quantity` de cada item en el array
    return delivery.dispatchItems.reduce(
      (sum, item) => sum + (item.dispatched_quantity || 0),
      0
    );
  }, [delivery.dispatchItems]);

  const hasItemsLoaded = totalDispatchedQuantity > 0;

  return (
    <Card className="flex flex-col transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-md font-semibold">
            Viaje #{delivery.id}
          </CardTitle>
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1.5" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-grow">
        {/* Información del Camión y Conductor */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {delivery.truck?.placa || "Sin placa"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {delivery.driver?.name || "Sin conductor"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Pedido: {delivery.orderDetails.order_number}
          </span>
        </div>

        {/* Muestra la foto si existe */}
        {delivery.loadPhoto && (
          <div className="relative h-32 w-full overflow-hidden rounded-md border group mt-2">
            <Image
              src={delivery.loadPhoto}
              alt={`Foto de carga para ${delivery.truck?.placa}`}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* Muestra la cantidad total si el viaje está cargado o ya salió */}
        {hasItemsLoaded && (
          <div className="p-3 bg-muted/50 rounded-lg mt-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Cantidad Total Cargada:</span>
              </div>
              <span className="font-bold text-base text-foreground">
                {totalDispatchedQuantity.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <Button variant="outline" size="sm" className="w-full" asChild>
          {/* Este link es clave para la navegación. Te lleva a la página de patio y resalta el viaje seleccionado. */}
          <Link href={`/yard/deliveries?highlight=${delivery.id}`}>
            Ver Viaje <Eye className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
