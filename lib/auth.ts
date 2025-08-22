"use client"

// Simple auth context for role-based access
import { createContext, useContext } from "react"
import type { User } from "./types"

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Mock users for development
export const mockUsers: User[] = [
  {
    id: "1",
    email: "cajero@cantera.com",
    name: "María González",
    role: "CASHIER",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    email: "patio@cantera.com",
    name: "Juan Pérez",
    role: "YARD",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    email: "seguridad@cantera.com",
    name: "Carlos López",
    role: "SECURITY",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    email: "admin@cantera.com",
    name: "Ana Martínez",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    email: "reportes@cantera.com",
    name: "Luis Rodríguez",
    role: "REPORTS",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]
