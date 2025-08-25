import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"
import { EmptyState } from "./empty-state"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyState?: {
    title: string
    description?: string
    icon?: ReactNode
  }
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return <EmptyState icon={emptyState.icon} title={emptyState.title} description={emptyState.description} />
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                >
                  {column.render ? column.render(item) : String(item[column.key] || "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
