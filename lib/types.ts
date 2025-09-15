// --- ENUMS y Tipos Base ---
export type UnitBase = "M3" | "TON" | "SACO" | "UNIDAD"

export type UserRole = "CASHIER" | "YARD" | "SECURITY" | "ADMIN" | "REPORTS"

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "PAID"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED_COMPLETE"
  | "CANCELLED";

export type DeliveryStatus =
  | "PENDING"  // Viaje creado, esperando en patio
  | "CARGADA"  // Viaje cargado, esperando para salir
  | "EXITED";  // Viaje ya salió de la planta

// --- Entidades Principales (Alineadas con la Base de Datos) ---

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
  id: number; // MODIFICADO: Coincide con INT de la DB
  name: string;
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
  customer_id: string;
  client?: {
    name: string | null;
  };
  name: string;
  direccion?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number; // MODIFICADO: Coincide con INT de la DB
  name: string;
  unit: string; // MODIFICADO: Simplificado para que coincida con la vista
  refProveedor?: string;
  description?: string;
  price_per_unit?: number;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Driver {
  id: number; // MODIFICADO: Coincide con INT de la DB
  name: string;
  docId?: string;
  phone?: string;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Truck {
  id: number; // MODIFICADO: Coincide con INT de la DB
  placa: string;
  // MODIFICADO: El conductor ya no es una propiedad directa del camión
  brand?: string;
  model?: string;
  capacity?: number;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- Entidades Transaccionales (NUEVA LÓGICA) ---

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product: Product; // MODIFICADO: El producto completo es más útil
  quantity: number;
  price_per_unit: number;
  unit: string;
  created_at?: Date;
  updated_at?: Date;
  dispatchItems?: DeliveryItem[];
}

export interface Order {
  id: number;
  order_number: string; // MODIFICADO: Nombre corregido
  customer_id: number;
  client: Client; // MODIFICADO: Objeto completo en lugar de solo el nombre
  destination_id?: number;
  destination?: Destination;
  status: OrderStatus;
  total?: number;
  created_at: Date;
  updated_at?: Date;
  notes?: string;
  items: OrderItem[]; // MODIFICADO: Es un array de OrderItem
  deliveries?: Delivery[];
}

/**
 * MODIFICADO: Esta es la interfaz central.
 * Representa un único viaje (despacho) con toda su información asociada.
 */
export interface Delivery {
  id: number;
  estado: DeliveryStatus;
  order: Order;    // El pedido completo al que pertenece este viaje
  truck: Truck;    // El camión específico que se usó en este viaje
  driver: Driver;  // El conductor que manejó en este viaje
  loadedAt?: Date;
  exitedAt?: Date;
  notes?: string;
  loadPhoto?: string;
  exitPhoto?: string;
}

export interface DeliveryItem {
  id: number; // MODIFICADO: Se agrega el ID propio de la tabla
  despacho_id: number; // MODIFICADO: Se agrega el ID del despacho
  pedido_item_id: number; // MODIFICADO: Se agrega el ID del item del pedido
  dispatched_quantity: number;
}

export interface DispatchGuide {
  id: string;
  deliveryId: string;
  numeroGuia: string;
  urlPdf?: string;
  fecha: string;
  fecha_emision: Date;
  datos_transportista?: string;
  origen?: string;
  destino?: string;
  document_url?: string;
  created_by: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Interfaces para Formularios y UI (Sin cambios) ---

export interface CreateOrderForm {
  customer_id: string;
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

// --- Tipos para Respuestas de API (Sin cambios) ---
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

export interface OrderProgress {
  orderId: string;
  totalItems: number;
  dispatchedItems: number;
  pendingItems: number;
  completedTrips: number;
  totalTrips: number;
  status: OrderStatus;
}

export interface TripSummary {
  deliveryId: string;
  tripNumber: number;
  status: DeliveryStatus;
  loadedQuantity: number;
  items: {
    productName: string;
    quantity: number;
    unit: string;
  }[];
  createdAt: Date;
  loadedAt?: Date;
  exitedAt?: Date;
}