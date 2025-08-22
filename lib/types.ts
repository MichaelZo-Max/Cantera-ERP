// Core entity types for Cantera ERP system
export interface User {
  id: string
  email: string
  name: string
  role: "CASHIER" | "YARD" | "SECURITY" | "ADMIN" | "REPORTS"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  rfc?: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  description?: string
  unit: string // m3, ton, etc.
  pricePerUnit: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Truck {
  id: string
  plates: string
  brand?: string
  model?: string
  capacity?: number
  driverName?: string
  driverPhone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  customer?: Customer
  productId: string
  product?: Product
  truckId: string
  truck?: Truck
  quantity: number
  pricePerUnit: number
  totalAmount: number
  status: "PENDING" | "IN_PROGRESS" | "LOADED" | "COMPLETED" | "CANCELLED"
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Delivery {
  id: string
  orderId: string
  order?: Order
  loadedQuantity: number
  loadedBy?: string
  loadedAt?: Date
  exitedBy?: string
  exitedAt?: Date
  notes?: string
  status: "PENDING" | "LOADED" | "EXITED"
  createdAt: Date
  updatedAt: Date
}

// Form types
export interface CreateOrderForm {
  customerId: string
  productId: string
  truckId: string
  quantity: number
  pricePerUnit: number
  notes?: string
}

export interface LoadDeliveryForm {
  deliveryId: string
  loadedQuantity: number
  notes?: string
}

export interface ExitDeliveryForm {
  deliveryId: string
  notes?: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
