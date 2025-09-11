// app/layout.tsx

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

// Modificamos Metadata para incluir el manifiesto
export const metadata: Metadata = {
  title: "Cantera ERP",
  description: "Sistema de gestión para cantera",
  generator: "v0.app",
  manifest: "/manifest.json", // <-- AÑADE ESTA LÍNEA
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>{/* La etiqueta del manifiesto se añadirá aquí automáticamente gracias a la metadata */}</head>
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="cantera-erp-theme"
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}