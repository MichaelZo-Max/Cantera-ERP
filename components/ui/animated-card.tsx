"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, type CardProps } from "@/components/ui/card"

interface AnimatedCardProps extends CardProps {
  hoverEffect?: "lift" | "glow" | "scale" | "none"
  animateIn?: boolean
  delay?: number
}

// Envuelve la definición de tu componente con React.memo
const AnimatedCard = React.memo(React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, hoverEffect = "lift", animateIn = true, delay = 0, children, ...props }, ref) => {
    // ... (el resto de tu lógica del componente se mantiene igual)
    const [isVisible, setIsVisible] = React.useState(!animateIn)

    React.useEffect(() => {
      if (animateIn) {
        const timer = setTimeout(() => setIsVisible(true), delay)
        return () => clearTimeout(timer)
      }
    }, [animateIn, delay])

    const hoverClasses = {
      lift: "hover:shadow-lg hover:-translate-y-1",
      glow: "hover:shadow-lg hover:shadow-primary/25",
      scale: "hover:scale-105",
      none: "",
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-smooth card-shadow",
          hoverClasses[hoverEffect],
          animateIn && !isVisible && "opacity-0 translate-y-4",
          animateIn && isVisible && "animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
      </Card>
    )
  },
))
AnimatedCard.displayName = "AnimatedCard"

export { AnimatedCard }