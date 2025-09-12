// lib/types.ts

export type UnitBase = "M3" | "TON" | "SACO" | "UNIDAD";

export type UserRole = "CASHIER" | "YARD" | "SECURITY" | "ADMIN" | "REPORTS";

export type OrderStatus =
  | "CREADA"
  | "PAGADA"
  | "EN_DESPACHO"
  | "PARCIAL"
  | "CERRADA"
  | "CANCELADA"
  // Nuevos estados del SQL.md
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'PARTIALLY_DISPATCHED'
  | 'DISPATCHED_COMPLETE'
  | 'CANCELLED';


export type DeliveryStatus =
  | "ASIGNADA"
  | "EN_CARGA"
  | "CARGADA"
  | "SALIDA_OK"
  | "RECHAZADA"
  // Nuevo estado del SQL.md
  | 'PENDING';

// Core entity types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

export interface Client {
  id: string;
  nombre: string;
  rif?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Destination {
  id: string;
  clientId: string;
  client?: {
    nombre: string | null;
  };
  nombre: string;
  direccion?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  refProveedor: string;
  nombre: string;
  description?: string;
  price_per_unit?: number;
  unit?: UnitBase;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  nombre: string;
  docId?: string;
  phone?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Truck {
  id: string;
  placa: string;
  transporterId?: string;
  driverId?: string; 
  driver?: Driver; 
  brand?: string;
  model?: string;
  capacity?: number;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber?: string;
  clientId: string;
  client?: Client;
  destinationId?: string;
  destination?: Destination;
  estado: OrderStatus;
  total?: number;
  totalPagado?: number;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  // --- CAMBIO CLAVE ---
  // Ahora una orden puede tener múltiples items.
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string; 
  product?: Product;
  cantidadSolicitadaBase: number;
  cantidadPendienteBase: number;
  precioUnitario?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Delivery {
  id: string;
  orderId: string;
  order?: Order;
  truckId: string;
  truck?: Truck;
  driverId?: string;
  driver?: Driver;
  client?: Client;
  product?: Product; 
  cantidadBase: number;
  loadedQuantity?: number;
  estado: DeliveryStatus;
  loadedBy?: string;
  loadedAt?: Date;
  loadPhoto?: string;
  exitedBy?: string;
  exitedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatchGuide {
  id: string;
  deliveryId: string;
  numeroGuia: string;
  urlPdf?: string;
  fecha: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderForm {
  clientId: string;
  destinationId?: string;
  items: {
    productId: string;
    cantidadBase: number;
    pricePerUnit: number;
    quantity: number;
  }[];
  pago: {
    metodo: string;
    monto: number;
    ref?: string;
  };
  truckId: string;
  driverId: string;
  photoFile?: File;
}

export interface LoadDeliveryForm {
  deliveryId: string;
  cantidadBase: number;
  photoFile: File;
  notes?: string;
}

export interface ExitDeliveryForm {
  deliveryId: string;
  photoFile: File;
  notes?: string;
}

export interface ProductSelection {
  productId: string;
  formatId: string;
}

export interface QuantityInputProps {
  unitBase: UnitBase;
  value: number;
  onChange: (value: number) => void;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
