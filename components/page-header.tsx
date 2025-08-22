"use client"
import type { ReactNode } from "react"
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs"

interface PageHeaderProps {
  title?: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <AppBreadcrumbs />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {title && <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions ? <div className="flex-shrink-0">{actions}</div> : null}
      </div>
    </div>
  )
}
