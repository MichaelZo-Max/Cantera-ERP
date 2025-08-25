export const APP_CONFIG = {
  name: "Cantera ERP",
  description: "Sistema de gestión para cantera",
  version: "1.0.0",
  author: "Cantera ERP Team",
} as const

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 10000,
  retries: 3,
} as const

export const STORAGE_KEYS = {
  user: "cantera-user",
  theme: "cantera-erp-theme",
  preferences: "cantera-preferences",
} as const

export const PAGINATION = {
  defaultLimit: 10,
  maxLimit: 100,
  defaultPage: 1,
} as const

export const VALIDATION = {
  minPasswordLength: 6,
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxNotesLength: 1000,
} as const
