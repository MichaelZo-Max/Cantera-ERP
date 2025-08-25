"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingCart, FileText, Truck, Shield, Users, Box, BarChart3 } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"

type Crumb = { href: string; label: string; icon?: React.ReactNode; current?: boolean }

const LABELS: Record<string, { label: string; icon?: React.ReactNode }> = {
  "": { label: "Inicio", icon: <Home className="h-3.5 w-3.5" aria-hidden="true" /> },
  cashier: { label: "Cajero", icon: <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> },
  orders: { label: "Pedidos", icon: <FileText className="h-3.5 w-3.5" aria-hidden="true" /> },
  list: { label: "Lista" },
  deliveries: { label: "Despachos", icon: <Truck className="h-3.5 w-3.5" aria-hidden="true" /> },
  yard: { label: "Patio", icon: <Truck className="h-3.5 w-3.5" aria-hidden="true" /> },
  security: { label: "Seguridad", icon: <Shield className="h-3.5 w-3.5" aria-hidden="true" /> },
  exits: { label: "Control de Salida" },
  admin: { label: "Administrador", icon: <Users className="h-3.5 w-3.5" aria-hidden="true" /> },
  customers: { label: "Clientes", icon: <Users className="h-3.5 w-3.5" aria-hidden="true" /> },
  products: { label: "Productos", icon: <Box className="h-3.5 w-3.5" aria-hidden="true" /> },
  trucks: { label: "Camiones", icon: <Truck className="h-3.5 w-3.5" aria-hidden="true" /> },
  reports: { label: "Reportes", icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> },
}

function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = []
  let acc = ""

  // Always include home
  crumbs.push({ href: "/", label: LABELS[""].label, icon: LABELS[""].icon })

  for (let i = 0; i < parts.length; i++) {
    const seg = decodeURIComponent(parts[i])
    acc += `/${seg}`
    const meta = LABELS[seg] || { label: seg }
    crumbs.push({ href: acc, label: meta.label, icon: meta.icon, current: i === parts.length - 1 })
  }
  return crumbs
}

export function AppBreadcrumbs() {
  const pathname = usePathname() || "/"
  const all = buildCrumbs(pathname)

  // Mobile: show Home / … / Current
  const head = all[0]
  const tail = all.slice(-1)[0]
  const middle = all.slice(1, -1)

  return (
    <Breadcrumb aria-label="Breadcrumb de navegación">
      <BreadcrumbList>
        {/* Desktop: todas las migas */}
        <div className="hidden sm:flex items-center flex-wrap">
          {all.map((c, idx) => (
            <div className="flex items-center" key={c.href + idx}>
              <BreadcrumbItem>
                {c.current ? (
                  <BreadcrumbPage>
                    <span className="inline-flex items-center gap-1.5">
                      {c.icon}
                      <span>{c.label}</span>
                    </span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href} prefetch={false} className="inline-flex items-center gap-1.5">
                      {c.icon}
                      <span>{c.label}</span>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {idx < all.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </div>

        {/* Mobile: colapsado */}
        <div className="sm:hidden flex items-center">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={head.href} prefetch={false} aria-label="Ir al inicio" className="inline-flex items-center gap-1.5">
                {head.icon}
                <span className="sr-only">{head.label}</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {middle.length > 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <span className="inline-flex items-center gap-1.5">
                {tail.icon}
                <span>{tail.label}</span>
              </span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </div>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
