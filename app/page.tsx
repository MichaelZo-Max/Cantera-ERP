"use client";

import { useAuth } from "@/components/auth-provider";
import { LoginForm } from "@/components/login-form";
import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Truck,
  Shield,
  Settings,
  BarChart3,
  Package,
  Users,
  FileText,
  MapPin,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

function Dashboard() {
  const { user } = useAuth();

  const getModulesForRole = (role: string) => {
    switch (role) {
      case "CASHIER":
        return [
          {
            title: "Crear Pedido",
            description: "Registrar nuevos pedidos de clientes",
            icon: ShoppingCart,
            href: "/cashier/orders",
            color: "bg-primary",
          },
          {
            title: "Ver Pedidos",
            description: "Consultar pedidos para despacho",
            icon: FileText,
            href: "/cashier/orders/list",
            color: "bg-primary",
          },
          {
            title: "Ver Órdenes de Caja",
            description: "Consultar ventas directas sin factura",
            icon: ClipboardList,
            href: "/cashier/cashier-orders",
            color: "bg-primary", 
          },
          {
            title: "Seguimiento de Despachos",
            description: "Monitorear estado de despachos creados",
            icon: Truck,
            href: "/cashier/deliveries",
            color: "bg-primary",
          },
        ];
      case "YARD":
        return [
          {
            title: "Confirmar Cargas",
            description: "Confirmar cantidad cargada en camiones",
            icon: Truck,
            href: "/yard/deliveries",
            color: "bg-primary",
          },
        ];
      case "SECURITY":
        return [
          {
            title: "Control de Salida",
            description: "Autorizar salida de camiones",
            icon: Shield,
            href: "/security/exits",
            color: "bg-primary",
          },
        ];
      case "ADMIN":
        return [
          {
            title: "Clientes",
            description: "Gestionar catálogo de clientes",
            icon: Users,
            href: "/admin/customers",
            color: "bg-primary",
          },
          {
            title: "Destinos",
            description: "Gestionar direcciones de entrega",
            icon: MapPin,
            href: "/admin/destinations",
            color: "bg-primary",
          },
          {
            title: "Productos",
            description: "Gestionar catálogo de productos",
            icon: Package,
            href: "/admin/products",
            color: "bg-primary",
          },
          {
            title: "Camiones",
            description: "Gestionar catálogo de camiones",
            icon: Truck,
            href: "/admin/trucks",
            color: "bg-primary",
          },
          {
            title: "Choferes",
            description: "Gestionar el personal de conducción",
            icon: UserCheck,
            href: "/admin/drivers",
            color: "bg-primary",
          },
          {
            title: "Usuarios",
            description: "Gestionar usuarios y permisos del sistema",
            icon: Shield,
            href: "/admin/users",
            color: "bg-primary",
          },
        ];
      case "REPORTS":
        return [
          {
            title: "Reportes",
            description: "Generar reportes del sistema",
            icon: BarChart3,
            href: "/reports",
            color: "bg-primary",
          },
        ];
      default:
        return [];
    }
  };

  const modules = getModulesForRole(user?.role || "");

  return (
    <AppLayout title="Panel Principal">
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Bienvenido, {user?.name}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Selecciona un módulo para comenzar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.href}
                className="h-full flex flex-col hover:shadow-lg transition-all duration-300 hover:scale-105 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 sm:p-3 rounded-lg ${module.color} group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-semibold">
                      {module.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <CardDescription className="mb-4 text-sm leading-relaxed">
                    {module.description}
                  </CardDescription>
                  <Button
                    asChild
                    className="w-full h-11 text-sm sm:text-base font-medium"
                  >
                    <Link href={module.href}>Acceder</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
}
