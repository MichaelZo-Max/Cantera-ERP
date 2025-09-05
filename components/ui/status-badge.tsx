import { cn } from "@/lib/utils"
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants"
import type { Order, Delivery } from "@/lib/types"

interface StatusBadgeProps {
  status: Order["estado"] | Delivery["estado"]
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        STATUS_COLORS[status as keyof typeof STATUS_COLORS],
        className,
      )}
    >
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
    </span>
  )
}