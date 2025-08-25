import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {icon && <div className="mx-auto h-12 w-12 text-gray-400 mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>}
      {action}
    </div>
  )
}
