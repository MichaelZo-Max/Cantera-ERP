"use client"

import { Truck, MapPin, Package, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Delivery } from "@/lib/types"

interface DeliveryCardProps {
  delivery: Delivery & {
    order?: {
      client?: { nombre: string }
      destination?: { nombre: string }
    }
    truck?: { placa: string }
    productFormat?: {
      product?: { nombre: string }
      sku?: string
      unidadBase: string
    }
  }
  onConfirmLoad?: (deliveryId: string) => void
  onViewDetails?: (deliveryId: string) => void
  showActions?: boolean
}

const STATUS_CONFIG = {
  ASIGNADA: {
    label: "Asignada",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Clock,
  },
  EN_CARGA: {
    label: "En Carga",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: Package,
  },
  CARGADA: {
    label: "Cargada",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle,
  },
  PEND_SALIDA: {
    label: "Pendiente Salida",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    icon: Truck,
  },
  SALIDA_OK: {
    label: "Salida OK",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    icon: CheckCircle,
  },
  RECHAZADA: {
    label: "Rechazada",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: Clock,
  },
} as const

export function DeliveryCard({ delivery, onConfirmLoad, onViewDetails, showActions = true }: DeliveryCardProps) {
  const statusConfig = STATUS_CONFIG[delivery.estado]
  const StatusIcon = statusConfig.icon

  const canConfirmLoad = delivery.estado === "ASIGNADA" && onConfirmLoad
  const canViewDetails = onViewDetails

  const handleCardClick = () => {
    if (canConfirmLoad) {
      onConfirmLoad(delivery.id)
    } else if (canViewDetails) {
      onViewDetails(delivery.id)
    }
  }

  const isClickable = canConfirmLoad || canViewDetails

  return (
    <Card
      className={`transition-all duration-200 ${
        isClickable ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary/50" : "hover:shadow-md"
      }`}
      onClick={isClickable ? handleCardClick : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-lg">{delivery.truck?.placa || "Sin placa"}</span>
          </div>
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Cliente y Destino */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Cliente:</span>
            <span className="text-muted-foreground">{delivery.order?.client?.nombre || "Sin cliente"}</span>
          </div>

          {delivery.order?.destination && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{delivery.order.destination.nombre}</span>
            </div>
          )}
        </div>

        {/* Material */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Material</span>
          </div>
          <div className="text-sm">
            <div className="font-medium">{delivery.productFormat?.product?.nombre || "Sin producto"}</div>
            <div className="text-muted-foreground">
              {delivery.productFormat?.sku || `Formato ${delivery.productFormat?.unidadBase}`}
            </div>
          </div>
        </div>

        {/* Cantidad */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Cantidad solicitada:</span>
          <span className="font-semibold">
            {delivery.cantidadBase} {delivery.productFormat?.unidadBase}
          </span>
        </div>

        {/* Información adicional según estado */}
        {delivery.loadedAt && (
          <div className="text-xs text-muted-foreground">Cargado: {new Date(delivery.loadedAt).toLocaleString()}</div>
        )}

        {delivery.exitedAt && (
          <div className="text-xs text-muted-foreground">Salida: {new Date(delivery.exitedAt).toLocaleString()}</div>
        )}
      </CardContent>

      {showActions && (canConfirmLoad || canViewDetails) && (
        <CardFooter className="pt-3 gap-2">
          {canConfirmLoad && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onConfirmLoad(delivery.id)
              }}
              className="flex-1"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar carga
            </Button>
          )}

          {canViewDetails && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails(delivery.id)
              }}
              size="sm"
            >
              Ver detalles
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
