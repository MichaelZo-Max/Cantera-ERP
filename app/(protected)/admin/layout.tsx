"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/') // Redirige si no es Admin
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return <div className="p-6 text-center">Verificando acceso...</div>
  }

  if (user.role === 'ADMIN') {
    return <>{children}</>
  }

  return null
}