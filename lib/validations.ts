// lib/validations.ts
import { z } from "zod";
import { VALIDATION } from "./config";
import { USER_ROLES, ORDER_STATUS, DELIVERY_STATUS } from "./constants";

// ... (se conservan los otros esquemas como userSchema, customerSchema, etc.)

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
  userId: z.number(),
});

// Esquema para un item individual dentro de un pedido
export const orderItemSchema = z.object({
  producto_id: z.number(),
  quantity: z.number().positive("La cantidad debe ser un número positivo"),
  unit_price: z.number().min(0, "El precio unitario no puede ser negativo"),
  total_price: z.number().min(0, "El precio total no puede ser negativo"),
});

/**
 * @description Esquema para un item individual dentro del formulario de creación de pedidos.
 * Coincide con la estructura de la tabla `APP_PEDIDOS_ITEMS`.
 */
export const createOrderItemSchema = z.object({
  producto_id: z.number({
    required_error: "El ID del producto es obligatorio.",
  }),
  quantity: z.number().positive("La cantidad debe ser un número positivo."),
  // Corresponde a 'price_per_unit' en la BBDD
  price_per_unit: z
    .number()
    .min(0, "El precio unitario no puede ser negativo."),
  // Nuevo campo requerido por la BBDD
  unit: z.string({
    required_error: "La unidad de medida es obligatoria.",
  }),
});

/**
 * @description Esquema para la CREACIÓN de un nuevo pedido.
 * Adaptado a la nueva estructura de la base de datos y la API.
 */
export const createOrderSchema = z.object({
  // Se cambia 'customer_id' por 'customer_id' para mantener consistencia.
  customer_id: z.number({ required_error: "El cliente es requerido." }),

  // Se añade el campo 'total' que ahora es parte del encabezado del pedido.
  total: z.number().min(0, "El total del pedido no puede ser negativo."),

  // Se eliminan 'destination_id', 'truck_id' y 'driver_id' porque ahora
  // pertenecen a la entidad de Despacho, no al Pedido.

  items: z
    .array(createOrderItemSchema)
    .min(1, "El pedido debe tener al menos un producto."),

  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
});

// ... (se conservan los otros esquemas como deliverySchema, etc.)
