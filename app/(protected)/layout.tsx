"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/?next=${encodeURIComponent(pathname ?? "/")}`)
    }
  }, [isLoading, user, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  return <>{children}</>
}
