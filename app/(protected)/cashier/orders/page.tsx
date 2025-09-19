// app/(protected)/cashier/page.tsx
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FilePlus, ListOrdered, Truck } from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";

// Array de configuración para las tarjetas del panel
const cashierActions = [
  {
    title: "Crear Pedido",
    description: "Inicia el proceso de registro de un nuevo pedido para un cliente, agregando productos y autorizando transporte.",
    href: "/cashier/orders/new",
    icon: FilePlus,
  },
  {
    title: "Ver Lista de Pedidos",
    description: "Consulta, edita y gestiona el historial completo de todos los pedidos registrados.",
    href: "/cashier/orders/list",
    icon: ListOrdered,
  },
  {
    title: "Seguimiento de Despachos",
    description: "Monitorea en tiempo real el estado de los viajes y las entregas de material.",
    href: "/cashier/deliveries",
    icon: Truck,
  },
];

export default function CashierDashboardPage() {
  // ✨ CORRECCIÓN: Asignamos el componente del ícono a una variable con mayúscula inicial
  const FirstActionIcon = cashierActions[0].icon;

  return (
    <AppLayout title="Panel de Cajero">
      <div className="space-y-6">
        {/* Encabezado Principal */}
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Panel Principal de Cajero
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Selecciona una de las siguientes opciones para comenzar a gestionar los pedidos y despachos de la cantera.
          </p>
        </div>
        
        {/* Contenedor de las tarjetas con el diseño solicitado */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Tarjeta principal que ocupa más espacio */}
          <div className="lg:col-span-3">
            <AnimatedCard hoverEffect="lift" className="h-full">
              <Link href={cashierActions[0].href} className="block h-full">
                <Card className="flex flex-col justify-between p-6 h-full transition-all duration-300 hover:border-primary/50">
                  <div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      {/* ✨ CORRECCIÓN: Usamos la variable con mayúscula para renderizar el ícono */}
                      <FirstActionIcon className="h-6 w-6 text-primary" />
                    </div>
                    <CardHeader className="p-0">
                      <CardTitle className="text-xl font-semibold">
                        {cashierActions[0].title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {cashierActions[0].description}
                      </CardDescription>
                    </CardHeader>
                  </div>
                </Card>
              </Link>
            </AnimatedCard>
          </div>

          {/* Columna para las otras dos tarjetas */}
          <div className="lg:col-span-2 space-y-6">
            {cashierActions.slice(1).map((action, index) => {
               // ✨ CORRECCIÓN: Asignamos el componente del ícono a una variable con mayúscula inicial
               const Icon = action.icon;
               return (
                <AnimatedCard key={action.href} hoverEffect="lift" delay={index * 100}>
                   <Link href={action.href}>
                    <Card className="p-6 transition-all duration-300 hover:border-primary/50">
                       <div className="flex items-start gap-4">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            {/* ✨ CORRECCIÓN: Usamos la variable con mayúscula para renderizar el ícono */}
                            <Icon className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                            <CardTitle className="text-lg font-semibold leading-tight">{action.title}</CardTitle>
                            <CardDescription className="mt-1 text-sm">{action.description}</CardDescription>
                         </div>
                       </div>
                    </Card>
                   </Link>
                </AnimatedCard>
               );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}