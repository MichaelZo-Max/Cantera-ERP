// components/ui/sonner.tsx
"use client"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/theme-provider" // 👈 tu provider

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return <Sonner theme={theme as ToasterProps["theme"]} {...props} />
}
export { Toaster }
