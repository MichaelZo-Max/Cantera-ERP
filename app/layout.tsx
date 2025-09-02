import type React from "react"
import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Cantera ERP",
  description: "Sistema de gestión para cantera",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      {/* Quitamos la clase de la fuente del <html> y la dejamos solo en <body> 
        para que next-themes pueda gestionar la clase del tema (light/dark) sin conflictos.
      */}
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class" // 👈 Añadido: le dice a next-themes que use clases (<html>)
          defaultTheme="system"
          enableSystem // 👈 Añadido: habilita el cambio automático con el tema del sistema
          storageKey="cantera-erp-theme"
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}