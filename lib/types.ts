// --- ENUMS y Tipos Base ---
export type UnitBase = "M3" | "TON" | "SACO" | "UNIDAD";

export type UserRole = "ADMIN" | "CASHIER" | "YARD" | "SECURITY" | "REPORTS";

export type OrderStatus =
  | "PENDING_INVOICE"
  | "INVOICED"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED_COMPLETE"
  | "CANCELLED";

export type DeliveryStatus =
  | "PENDING" // Viaje creado, esperando en patio
  | "CARGADA" // Viaje cargado, esperando para salir
  | "EXITED"; // Viaje ya salió de la planta

// --- Entidades Principales (Alineadas con la Base de Datos) ---

export interface User {
  id: Number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

export interface CashierOrderDetail {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  price_usd: number;
  total_usd: number;
}

export interface Client {
  id: number;
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
  address?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number;
  name: string;
  unit: string;
  refProveedor?: string;
  description?: string;
  price_per_unit?: number;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Invoice {
  invoice_series: string;
  invoice_number: number;
  invoice_n: string;
  invoice_full_number?: string;
  customer_id: number;
  customer_name?: string;
  invoice_date?: Date;
  total_usd: number;
}

export interface Driver {
  id: number;
  name: string;
  docId?: string;
  phone?: string;
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  clients?: Client[];
}

export interface Truck {
  id: number;
  placa: string;
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
  product: Product;
  quantity: number;
  price_per_unit: number;
  unit: string;
  totalDispatched?: number;
  created_at?: Date;
  updated_at?: Date;
  dispatchItems?: DeliveryItem[];
}

export interface InvoiceProduct extends Product {
  available_quantity: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  client: Client;
  destination_id?: number;
  destination?: Destination;
  status: OrderStatus;
  total?: number;
  created_at: Date;
  updated_at?: Date;
  notes?: string;
  items: OrderItem[];
  deliveries?: Delivery[];
  trucks?: Truck[];
  drivers?: Driver[];
  invoices: Invoice[];
}

export interface Delivery {
  id: number;
  estado: DeliveryStatus;
  orderDetails: Order;
  truck: Truck;
  driver: Driver;
  loadedAt?: Date;
  exitedAt?: Date;
  notes?: string;
  loadPhoto?: string;
  exitPhoto?: string;
  dispatchItems?: DeliveryItem[];
}

export interface DeliveryItem {
  id: number;
  despacho_id: number;
  pedido_item_id: number;
  dispatched_quantity: number;
  orderItem?: OrderItem;
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

// --- Interfaces para Formularios y UI ---

/**
 * @description MODIFICADO: Representa un item en el formulario de creación de pedidos.
 * Sincronizado con `createOrderItemSchema`.
 */
export interface CreateOrderItemForm {
  product_id: number;
  quantity: number;
  price_per_unit: number;
  unit: string;
}

/**
 * @description MODIFICADO: Representa el formulario para crear un nuevo pedido.
 * Esta interfaz ahora coincide exactamente con el `createOrderSchema` y los datos
 * que la API route espera.
 */
export interface CreateOrderForm {
  customer_id: number;
  destination_id?: number | null;
  items: CreateOrderItemForm[];
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
  order_id: string;
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
// Tipos para las nuevas Órdenes de Caja sin Factura
export type CashierOrder = {
  id: number;
  order_number: string;
  customer_id: number;
  customer_doc_id?: string | null;
  total_usd: number;
  exchange_rate?: number | null;
  status: "PENDING_INVOICE" | "INVOICED" | "CANCELLED";
  created_by: number;
  created_at: string;
  updated_at: string;
  // Opcional: para incluir los items en la misma consulta
  items?: CashierOrderItem[];
  customer_name?: string; // Campo que viene del JOIN con CLIENTES
  created_by_name?: string; // Campo que viene del JOIN con APP_USUARIOS
  details: CashierOrderDetail[];
};

export type CashierOrderItem = {
  id: number;
  order_cab_id: number;
  product_id: number;
  product_ref?: string | null;
  product_name: string;
  quantity: number;
  price_per_unit_usd: number;
  subtotal_usd: number;
};

// Tipo para crear una nueva orden de caja (lo que enviará el formulario)
export type CreateCashierOrderDto = {
  customer_id: number;
  customer_doc_id?: string;
  total_usd: number;
  exchange_rate?: number;
  items: Omit<CashierOrderItem, "id" | "order_cab_id" | "subtotal_usd">[];
};
