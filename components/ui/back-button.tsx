"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export function BackButton() {
  const router = useRouter()
  const pathname = usePathname() || "/"

  const segments = pathname.split("/").filter(Boolean)
  const fallback = segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : "/"

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.replace(fallback)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleBack}
      aria-label="Volver atrás"
      className="
        group h-10 sm:h-11 px-3 sm:px-4
        rounded-md border bg-card text-foreground shadow-sm
        hover:bg-accent/10 hover:border-primary/40
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        transition-smooth
      "
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium">Atrás</span>
      </span>
    </Button>
  )
}
