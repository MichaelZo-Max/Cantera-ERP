import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  lines?: number
  variant?: "text" | "card" | "avatar" | "button"
}

export function LoadingSkeleton({ className, lines = 1, variant = "text" }: LoadingSkeletonProps) {
  const variants = {
    text: "h-4 rounded",
    card: "h-32 rounded-lg",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 rounded-md",
  }

  if (lines === 1) {
    return <div className={cn("skeleton animate-shimmer", variants[variant], className)} />
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "skeleton animate-shimmer",
            variants[variant],
            i === lines - 1 && "w-3/4", // Last line shorter
            className,
          )}
        />
      ))}
    </div>
  )
}
