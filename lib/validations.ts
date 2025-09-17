import { z } from "zod";

/**
 * @description Esquema para un item individual dentro del formulario de creación de pedidos.
 * Estandarizado para usar 'product_id'.
 */
export const createOrderItemSchema = z.object({
  product_id: z.number({
    required_error: "El ID del producto es obligatorio.",
    invalid_type_error: "El ID del producto debe ser un número.",
  }).int().positive("El ID del producto debe ser un entero positivo."),

  quantity: z.number().positive("La cantidad debe ser un número positivo."),
  
  price_per_unit: z
    .number()
    .nonnegative("El precio unitario no puede ser negativo."),

  unit: z.string({
    required_error: "La unidad de medida es obligatoria.",
  }).min(1, "La unidad no puede estar vacía."), // ✨ MEJORA: Evita strings vacíos.
});

/**
 * @description Esquema para la CREACIÓN de un nuevo pedido.
 * Sincronizado con los campos que la API route realmente utiliza.
 */
export const createOrderSchema = z.object({
  customer_id: z.number({ 
    required_error: "El cliente es requerido." 
  }).int().positive("El ID de cliente debe ser un entero positivo."),
  
  total: z.number().nonnegative("El total no puede ser negativo."),

  destination_id: z.number().int().positive().nullable().optional(),

  items: z
    .array(createOrderItemSchema)
    .min(1, "El pedido debe tener al menos un producto."),
});

// ... aquí irían los otros esquemas que no necesitan cambios