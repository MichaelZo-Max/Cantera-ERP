"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function YardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'YARD') {
      router.replace('/') // Redirige si no es de Patio
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return <div className="p-6 text-center">Verificando acceso...</div>
  }

  if (user.role === 'YARD') {
    return <>{children}</>
  }

  return null
}