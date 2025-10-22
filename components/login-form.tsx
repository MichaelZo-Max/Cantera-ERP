// components/login-form.tsx
"use client";

import type React from "react";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Info, ChevronUp, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTheme } from "next-themes";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // 1. Importar el componente

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTestAccountsOpen, setIsTestAccountsOpen] = useState(false);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      if (next) {
        router.replace(next);
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  const selectTestAccount = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("123456");
    setIsTestAccountsOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      {/* Desktop test accounts */}
      <div className="absolute top-4 right-4 max-w-xs hidden lg:block animate-fade-in">
        <Card className="card-shadow-lg border-border/50 bg-card/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Usuarios de prueba
              </CardTitle>
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
                  <div className="font-medium text-foreground">
                    {user.email}
                  </div>
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

      {/* Main login form */}
      <div className="w-full max-w-md animate-fade-in">
        <Card className="card-shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-fit">
              <Image
                src={
                  theme === "dark"
                    ? "/logo-cantera-blanco.webp"
                    : "/logo-cantera-negro.webp"
                }
                alt="Cantera ERP Logo"
                width={96}
                height={96}
                className="h-24 w-24 object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              {/* 2. Reemplazar CardTitle con TextGenerateEffect */}
              <div className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <TextGenerateEffect
                  words="Bienvenid@ de nuevo!"
                  className="text-3xl font-bold"
                />
              </div>
              <CardDescription className="text-base">
                Sistema de gestión para canteras
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium flex items-center space-x-2"
                >
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
                <Label
                  htmlFor="password"
                  className="text-sm font-medium flex items-center space-x-2"
                >
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

      {/* Mobile test accounts */}
      <div className="w-full max-w-md mt-4 lg:hidden animate-fade-in">
        <Collapsible
          open={isTestAccountsOpen}
          onOpenChange={setIsTestAccountsOpen}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card/90 transition-smooth"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Cuentas de prueba</span>
                </div>
                {isTestAccountsOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="card-shadow-lg border-border/50 bg-card/90 backdrop-blur-md">
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-2">
                  {[
                    {
                      email: "cajero@cantera.com",
                      role: "Cajero",
                      color: "bg-blue-500/10 border-blue-500/20",
                    },
                    {
                      email: "patio@cantera.com",
                      role: "Patio",
                      color: "bg-green-500/10 border-green-500/20",
                    },
                    {
                      email: "seguridad@cantera.com",
                      role: "Seguridad",
                      color: "bg-orange-500/10 border-orange-500/20",
                    },
                    {
                      email: "admin@cantera.com",
                      role: "Admin",
                      color: "bg-purple-500/10 border-purple-500/20",
                    },
                  ].map((user, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className={`h-auto p-3 justify-start text-left hover:scale-[1.02] transition-all duration-200 ${user.color} border`}
                      onClick={() => selectTestAccount(user.email)}
                    >
                      <div className="w-full">
                        <div className="font-medium text-foreground text-sm truncate">
                          {user.email}
                        </div>
                        <div className="text-primary font-medium text-xs">
                          {user.role}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Contraseña:</span>{" "}
                    <span className="font-mono font-bold text-primary text-base">
                      123456
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
