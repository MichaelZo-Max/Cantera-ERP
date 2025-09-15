// lib/validations.ts
import { z } from "zod";
import { VALIDATION } from "./config";
import { USER_ROLES, ORDER_STATUS, DELIVERY_STATUS } from "./constants";

// ... (se conservan los otros esquemas como userSchema, customerSchema, etc.)

// --- INICIO DE CAMBIOS ---

// Se mantiene el esquema original si se usa para mostrar datos en otra parte
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


// Nuevo esquema para la CREACIÓN de pedidos, que coincide con la API
export const createOrderSchema = z.object({
  customer_id: z.number({ required_error: "ID de cliente es requerido." }),
  destination_id: z.number({ required_error: "ID de destino es requerido." }),
  truck_id: z.number({ required_error: "ID de camión es requerido." }),
  driver_id: z.number({ required_error: "ID de conductor es requerido." }),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un producto."),
  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
});


// ... (se conservan los otros esquemas como deliverySchema, etc.)