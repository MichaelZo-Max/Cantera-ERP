// lib/types.ts

export type UnitBase = "M3" | "TON" | "SACO" | "UNIDAD"

export type UserRole = "CASHIER" | "YARD" | "SECURITY" | "ADMIN" | "REPORTS"

export type OrderStatus =
  | "CREADA"
  | "PAGADA"
  | "EN_DESPACHO"
  | "PARCIAL"
  | "CERRADA"
  | "CANCELADA"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED_COMPLETE"
  | "CANCELLED"

export type DeliveryStatus =
  | "ASIGNADA"
  | "EN_CARGA"
  | "CARGADA"
  | "SALIDA_OK"
  | "RECHAZADA"
  | "PENDING"
  | "LOADING"
  | "LOADED"
  | "EXITED"

// Core entity types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  createdAt: Date
  updatedAt: Date
  image?: string | null
}

export interface Client {
  id: string
  name: string
  rif?: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface Destination {
  id: string
  customer_id: string
  client?: {
    name: string | null
  }
  name: string
  direccion?: string
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  refProveedor: string
  name: string
  description?: string
  price_per_unit?: number
  unit?: UnitBase
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Driver {
  id: string
  name: string
  docId?: string
  phone?: string
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Truck {
  id: string
  placa: string
  transporterId?: string
  driverId?: string
  driver?: Driver
  brand?: string
  model?: string
  capacity?: number
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: number // Cambiado de string a number para coincidir con DB
  order_number?: string // Cambiado nombre para coincidir con API
  customer_id: number // Cambiado de string a number
  client_name?: string // Agregado para coincidir con API response
  destination_id?: number // Cambiado de string a number
  destination?: Destination
  status: OrderStatus // Cambiado de 'estado' a 'status'
  total?: number
  created_at: Date // Cambiado de createdAt para coincidir con DB
  updated_at?: Date
  notes?: string // Added notes property to fix TypeScript error
  items?: OrderItem[]
  deliveries?: Delivery[]
}

export interface OrderItem {
  id: number // Cambiado de string a number
  order_id: number // Cambiado de orderId y string a number
  product_id: number // Cambiado de productId y string a number
  product?: Product
  quantity: number
  price_per_unit: number
  unit: string
  created_at: Date
  updated_at: Date
  dispatchItems?: DeliveryItem[]
}

export interface Delivery {
  id: number // Cambiado de string a number
  orderId: string // Mantenido como string para compatibilidad con frontend
  order?: {
    id: number
    orderNumber: string
    client: { name: string }
  }
  client?: { name: string }
  truck?: { placa: string }
  destination?: { name: string }
  estado: DeliveryStatus
  loadedQuantity?: number
  loadedAt?: Date
  exitedAt?: Date
  createdAt: Date
  notes?: string
  loadPhoto?: string
  exitPhoto?: string
  items?: DeliveryItem[]
  cantidadBase: number
}

export interface DeliveryItem {
  dispatched_quantity: number
  orderItem: {
    id: number
    quantity: number
    product: {
      id: number
      name: string
      unit: string
    }
  }
}

export interface DispatchGuide {
  id: string
  deliveryId: string
  numeroGuia: string
  urlPdf?: string
  fecha: string
  fecha_emision: Date
  datos_transportista?: string
  origen?: string
  destino?: string
  document_url?: string
  created_by: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrderForm {
  customer_id: string
  destinationId?: string
  items: {
    productId: string
    cantidadBase: number
    pricePerUnit: number
    quantity: number
  }[]
  pago: {
    metodo: string
    monto: number
    ref?: string
  }
  truckId: string
  driverId: string
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

export interface OrderProgress {
  orderId: string
  totalItems: number
  dispatchedItems: number
  pendingItems: number
  completedTrips: number
  totalTrips: number
  status: OrderStatus
}

export interface TripSummary {
  deliveryId: string
  tripNumber: number
  status: DeliveryStatus
  loadedQuantity: number
  items: {
    productName: string
    quantity: number
    unit: string
  }[]
  createdAt: Date
  loadedAt?: Date
  exitedAt?: Date
}
