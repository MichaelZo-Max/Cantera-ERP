import { z } from "zod"
import { VALIDATION } from "./config"
import { USER_ROLES, ORDER_STATUS, DELIVERY_STATUS } from "./constants"

// User validations
export const userSchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "Nombre es requerido").max(VALIDATION.maxNameLength),
  role: z.enum([USER_ROLES.CASHIER, USER_ROLES.YARD, USER_ROLES.SECURITY, USER_ROLES.ADMIN, USER_ROLES.REPORTS]),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(VALIDATION.minPasswordLength, `Contraseña debe tener al menos ${VALIDATION.minPasswordLength} caracteres`),
})

// Customer validations
export const customerSchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  name: z.string().min(1, "Nombre es requerido").max(VALIDATION.maxNameLength),
  rfc: z.string().optional(),
  address: z.string().max(VALIDATION.maxDescriptionLength).optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createCustomerSchema = customerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Product validations
export const productSchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  name: z.string().min(1, "Nombre es requerido").max(VALIDATION.maxNameLength),
  description: z.string().max(VALIDATION.maxDescriptionLength).optional(),
  unit: z.string().min(1, "Unidad es requerida"),
  pricePerUnit: z.number().positive("Precio debe ser mayor a 0"),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Truck validations
export const truckSchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  plates: z.string().min(1, "Placas son requeridas").max(20),
  brand: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  capacity: z.number().positive().optional(),
  driverName: z.string().max(VALIDATION.maxNameLength).optional(),
  driverPhone: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createTruckSchema = truckSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Order validations
export const orderSchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  orderNumber: z.string().min(1, "Número de orden es requerido"),
  customerId: z.string().min(1, "Cliente es requerido"),
  productId: z.string().min(1, "Producto es requerido"),
  truckId: z.string().min(1, "Camión es requerido"),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  pricePerUnit: z.number().positive("Precio debe ser mayor a 0"),
  totalAmount: z.number().positive("Total debe ser mayor a 0"),
  status: z.enum([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.LOADED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
  ]),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
  createdBy: z.string().min(1, "Creado por es requerido"),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Cliente es requerido"),
  productId: z.string().min(1, "Producto es requerido"),
  truckId: z.string().min(1, "Camión es requerido"),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  pricePerUnit: z.number().positive("Precio debe ser mayor a 0"),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
})

// Delivery validations
export const deliverySchema = z.object({
  id: z.string().min(1, "ID es requerido"),
  orderId: z.string().min(1, "Orden es requerida"),
  loadedQuantity: z.number().positive("Cantidad cargada debe ser mayor a 0"),
  loadedBy: z.string().optional(),
  loadedAt: z.date().optional(),
  exitedBy: z.string().optional(),
  exitedAt: z.date().optional(),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
  status: z.enum([DELIVERY_STATUS.PENDING, DELIVERY_STATUS.LOADED, DELIVERY_STATUS.EXITED]),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const loadDeliverySchema = z.object({
  deliveryId: z.string().min(1, "ID de entrega es requerido"),
  loadedQuantity: z.number().positive("Cantidad cargada debe ser mayor a 0"),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
})

export const exitDeliverySchema = z.object({
  deliveryId: z.string().min(1, "ID de entrega es requerido"),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
})
