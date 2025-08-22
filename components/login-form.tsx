"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Mail, Lock, Info } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get("next")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      await login(email, password)
      // redirigir a la ruta solicitada o dashboard
      if (next) {
        router.replace(next)
      } else {
        router.replace("/")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4 max-w-xs hidden lg:block animate-fade-in">
        <Card className="card-shadow-lg border-border/50 bg-card/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Usuarios de prueba</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { email: "cajero@cantera.com", role: "Cajero" },
                { email: "patio@cantera.com", role: "Patio" },
                { email: "seguridad@cantera.com", role: "Seguridad" },
                { email: "admin@cantera.com", role: "Administrador" },
                { email: "reportes@cantera.com", role: "Reportes" },
              ].map((user, index) => (
                <div
                  key={index}
                  className="text-xs p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-smooth cursor-pointer"
                  onClick={() => setEmail(user.email)}
                >
                  <div className="font-medium text-foreground">{user.email}</div>
                  <div className="text-primary font-medium">{user.role}</div>
                </div>
              ))}
            </div>
            <div className="text-center p-2 bg-primary/5 rounded-md border border-primary/20">
              <p className="text-xs text-foreground">
                <span className="font-medium">Contraseña:</span>{" "}
                <span className="font-mono font-bold text-primary">123456</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute bottom-4 left-4 right-4 lg:hidden animate-fade-in">
        <Card className="card-shadow-lg border-border/50 bg-card/90 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Usuarios de prueba</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { email: "cajero@cantera.com", role: "Cajero" },
                { email: "patio@cantera.com", role: "Patio" },
                { email: "seguridad@cantera.com", role: "Seguridad" },
                { email: "admin@cantera.com", role: "Admin" },
              ].map((user, index) => (
                <div
                  key={index}
                  className="p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-smooth cursor-pointer text-center"
                  onClick={() => setEmail(user.email)}
                >
                  <div className="font-medium text-foreground truncate">{user.email}</div>
                  <div className="text-primary font-medium">{user.role}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-2 p-2 bg-primary/5 rounded-md">
              <span className="text-xs font-medium">Contraseña: </span>
              <span className="text-xs font-mono font-bold text-primary">123456</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main login form - centered and unchanged */}
      <div className="w-full max-w-md animate-fade-in">
        <Card className="card-shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto p-3 bg-primary/10 rounded-2xl w-fit">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cantera ERP
              </CardTitle>
              <CardDescription className="text-base">Sistema de gestión para canteras</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Correo electrónico</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@cantera.com"
                  className="h-11 focus-ring transition-smooth"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>Contraseña</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 focus-ring transition-smooth"
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive" className="animate-slide-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full h-11 font-medium transition-smooth hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
