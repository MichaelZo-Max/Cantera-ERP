import { z } from "zod";

/**
 * @description Esquema para un item individual dentro del formulario de creación de pedidos.
 * Estandarizado para usar 'product_id'.
 */
export const createOrderItemSchema = z.object({
  // 'product_id' se alinea con el campo usado en el bucle de la API route.
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
 * Sincronizado con los campos que la API route realmente utiliza.
 */
export const createOrderSchema = z.object({
  customer_id: z.number({ required_error: "El cliente es requerido." }),

  // 'destination_id' es opcional y puede ser nulo, tal como lo maneja la API.
  destination_id: z.number().nullable().optional(),

  // Se elimina el campo 'notes', ya que no se utiliza en la lógica de inserción de la API.

  items: z
    .array(createOrderItemSchema)
    .min(1, "El pedido debe tener al menos un producto."),
});

// ... aquí irían los otros esquemas que no necesitan cambios