// Archivo: app/(protected)/cashier/layout.tsx
"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function CashierLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'CASHIER') {
      // Si el usuario está logueado pero NO es cajero, lo expulsamos.
      router.replace('/') // Redirige al panel principal
    }
  }, [isLoading, user, router])

  // Mientras carga o si el rol es correcto, no hacemos nada y mostramos el contenido.
  if (isLoading || !user) {
    // El layout principal de (protected) ya se encarga de esto,
    // pero es bueno tener una pantalla de carga aquí también.
    return <div className="p-6 text-center">Verificando acceso...</div>
  }

  if (user.role === 'CASHIER') {
    return <>{children}</> // Rol correcto, muestra la página.
  }

  // Si el rol no es el correcto, no muestra nada mientras redirige.
  return null
}