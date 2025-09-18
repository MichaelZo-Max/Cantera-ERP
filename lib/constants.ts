export const USER_ROLES = {
  CASHIER: "CASHIER",
  YARD: "YARD",
  SECURITY: "SECURITY",
  ADMIN: "ADMIN",
  REPORTS: "REPORTS",
} as const

export const ORDER_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  LOADED: "LOADED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export const DELIVERY_STATUS = {
  PENDING: "PENDING",
  LOADED: "LOADED",
  EXITED: "EXITED",
} as const

export const PRODUCT_UNITS = {
  M3: "m³",
  TON: "ton",
  KG: "kg",
  PIECE: "pza",
} as const

export const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  [ORDER_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  [ORDER_STATUS.LOADED]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  [ORDER_STATUS.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [ORDER_STATUS.CANCELLED]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
} as const

export const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: "Pendiente",
  [ORDER_STATUS.IN_PROGRESS]: "En Proceso",
  [ORDER_STATUS.LOADED]: "Cargado",
  [ORDER_STATUS.COMPLETED]: "Completado",
  [ORDER_STATUS.CANCELLED]: "Cancelado",
} as const

export const ROLE_LABELS = {
  [USER_ROLES.CASHIER]: "Cajero",
  [USER_ROLES.YARD]: "Patio",
  [USER_ROLES.SECURITY]: "Seguridad",
  [USER_ROLES.ADMIN]: "Administrador",
  [USER_ROLES.REPORTS]: "Reportes",
} as const
