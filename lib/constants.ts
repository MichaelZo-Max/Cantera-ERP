export const USER_ROLES = {
  CASHIER: "CASHIER",
  YARD: "YARD",
  SECURITY: "SECURITY",
  ADMIN: "ADMIN",
  REPORTS: "REPORTS",
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  LOADED: "LOADED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const DELIVERY_STATUS = {
  PENDING: "PENDING",
  LOADED: "LOADED",
  EXITED: "EXITED",
} as const;

export const PRODUCT_UNITS = {
  UNIDAD: "Unidad",
} as const;

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  [ORDER_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  [ORDER_STATUS.LOADED]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  [ORDER_STATUS.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [ORDER_STATUS.CANCELLED]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
} as const;

export const DELIVERY_STATUS_COLORS = {
  [DELIVERY_STATUS.PENDING]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  [DELIVERY_STATUS.LOADED]: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  [DELIVERY_STATUS.EXITED]: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
} as const;