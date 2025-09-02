// Core enums and types for Cantera ERP system
export type UnitBase = "M3" | "TON" | "BOLSA" | "UNIDAD"

export type UserRole = "CASHIER" | "YARD" | "SECURITY" | "ADMIN" | "REPORTS"

export type OrderStatus = "CREADA" | "PAGADA" | "EN_DESPACHO" | "PARCIAL" | "CERRADA" | "CANCELADA"

export type DeliveryStatus = "ASIGNADA" | "EN_CARGA" | "CARGADA" | "SALIDA_OK" | "RECHAZADA"

export type ProductArea = "AGREGADOS" | "ASFALTOS" | "VIVEROS" | "SERVICIOS"

// Core entity types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  nombre: string
  rif?: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Destination {
  id: string
  clientId: string
  nombre: string
  direccion?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  codigo: string
  nombre: string
  description?: string
  area: ProductArea
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductFormat {
  id: string
  productId: string
  product?: Product
  unidadBase: UnitBase
  factorUnidadBase: number
  sku?: string
  pricePerUnit?: number
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Driver {
  id: string
  nombre: string
  docId?: string
  phone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Truck {
  id: string
  placa: string
  transporterId?: string
  brand?: string
  model?: string
  capacity?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber?: string
  clientId: string
  client?: Client
  destinationId?: string
  destination?: Destination
  estado: OrderStatus
  total?: number
  totalPagado?: number
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productFormatId: string
  productFormat?: ProductFormat
  cantidadSolicitadaBase: number
  cantidadPendienteBase: number
  precioUnitario?: number
  createdAt: Date
  updatedAt: Date
}

export interface Delivery {
  id: string
  orderId: string
  order?: Order
  truckId: string
  truck?: Truck
  driverId?: string
  driver?: Driver
  productFormat?: ProductFormat
  cantidadBase: number
  loadedQuantity?: number
  estado: DeliveryStatus
  loadedBy?: string
  loadedAt?: Date
  loadPhoto?: string // ✨ Propiedad añadida para la foto de carga
  exitedBy?: string
  exitedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface DispatchGuide {
  id: string
  deliveryId: string
  numeroGuia: string
  urlPdf?: string
  fecha: string
  createdAt: Date
  updatedAt: Date
}

// Form types
export interface CreateOrderForm {
  clientId: string
  destinationId?: string
  items: {
    productFormatId: string
    cantidadBase: number
  }[]
  pago: {
    metodo: string
    monto: number
    ref?: string
  }
  truck: {
    placa: string
  }
  photoFile?: File
}

export interface LoadDeliveryForm {
  deliveryId: string
  cantidadBase: number
  photoFile: File
  notes?: string
}

export interface ExitDeliveryForm {
  deliveryId: string
  photoFile: File
  notes?: string
}

export interface ProductSelection {
  productId: string
  formatId: string
}

export interface QuantityInputProps {
  unitBase: UnitBase
  value: number
  onChange: (value: number) => void
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