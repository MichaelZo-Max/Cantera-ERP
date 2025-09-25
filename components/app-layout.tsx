"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/ui/back-button"
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs"
import { Footer } from "./footer"
import { LogOut, User } from "lucide-react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

interface AppLayoutProps {
  children: ReactNode
  title: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const { theme } = useTheme()

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      CASHIER: "Cajero",
      YARD: "Patio",
      SECURITY: "Seguridad",
      ADMIN: "Administrador",
      REPORTS: "Reportes",
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const p = pathname || "/"

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-4 animate-slide-in min-w-0 flex-1">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div className="flex-shrink-0">
                  <Image
                    src={
                      theme === "dark"
                        ? "/logo-cantera-blanco.webp"
                        : "/logo-cantera-negro.webp"
                    }
                    alt="Cantera ERP Logo"
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    Cantera ERP
                  </h1>
                  <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                    {title}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 animate-fade-in flex-shrink-0">
              {/* 👇 CAMBIO AQUÍ: Eliminado 'bg-background' */}
              <div className="hidden sm:flex items-center space-x-3 px-3 py-2 rounded-lg border border-border/50">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {user?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getRoleDisplayName(user?.role || "")}
                  </div>
                </div>
              </div>

              {/* 👇 Y CAMBIO AQUÍ TAMBIÉN (para vista móvil) */}
              <div className="sm:hidden flex items-center space-x-2 px-2 py-1.5 rounded-lg border border-border/50">
                <div className="p-1 bg-primary/10 rounded-full">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <div className="text-xs font-medium text-foreground truncate max-w-20">
                  {user?.name?.split(" ")[0]}
                </div>
              </div>

              <ThemeToggle />

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-smooth bg-transparent h-8 sm:h-9 px-2 sm:px-3"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-sm">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 animate-fade-in w-full">
        {pathname !== "/" && (
          <div className="mb-4 sm:mb-6">
            <AppBreadcrumbs />
          </div>
        )}

        {p !== "/" && (
          <div className="mb-3 sm:mb-4">
            <BackButton />
          </div>
        )}
        <div className="space-y-4 sm:space-y-6">{children}</div>
      </main>

      <Footer />
    </div>
  )
}