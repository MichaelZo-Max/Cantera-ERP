import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: Date | string, formatStr = "dd/MM/yyyy"): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: es })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `ORD-${year}${month}${day}-${random}`
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateRFC(rfc: string): boolean {
  const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/
  return rfcRegex.test(rfc.toUpperCase())
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone.replace(/\D/g, ""))
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, " ")
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
