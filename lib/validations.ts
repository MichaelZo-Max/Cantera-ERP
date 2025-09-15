import { z } from "zod";
import { VALIDATION } from "./config";

/**
 * @description Esquema para un item individual dentro del formulario de creación de pedidos.
 * Estandarizado para usar 'product_id'.
 */
export const createOrderItemSchema = z.object({
  // Corregido: 'producto_id' a 'product_id' para consistencia.
  product_id: z.number({
    required_error: "El ID del producto es obligatorio.",
  }),
  quantity: z.number().positive("La cantidad debe ser un número positivo."),
  price_per_unit: z
    .number()
    .min(0, "El precio unitario no puede ser negativo."),
  unit: z.string({
    required_error: "La unidad de medida es obligatoria.",
  }),
});

/**
 * @description Esquema para la CREACIÓN de un nuevo pedido.
 * Adaptado a la lógica final sin camión y con destino opcional.
 */
export const createOrderSchema = z.object({
  customer_id: z.number({ required_error: "El cliente es requerido." }),

  // Se añade 'destination_id' como opcional y que puede ser nulo.
  destination_id: z.number().nullable().optional(),

  // Se elimina el campo 'total', ya que no se guarda en el encabezado.

  items: z
    .array(createOrderItemSchema)
    .min(1, "El pedido debe tener al menos un producto."),

  notes: z.string().max(VALIDATION.maxNotesLength).optional(),
});

// ... aquí irían los otros esquemas que no necesitan cambios