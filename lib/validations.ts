// lib/validations.ts

import { z } from "zod";

/**
 * @description Esquema para un item individual dentro del formulario de creación de pedidos.
 * Estandarizado para usar 'product_id'.
 */
export const createOrderItemSchema = z.object({
  product_id: z
    .number({
      required_error: "El ID del producto es obligatorio.",
      invalid_type_error: "El ID del producto debe ser un número.",
    })
    .int()
    .positive("El ID del producto debe ser un entero positivo."),

  quantity: z.number().positive("La cantidad debe ser un número positivo."),

  price_per_unit: z
    .number()
    .nonnegative("El precio unitario no puede ser negativo."),

  unit: z
    .string({
      required_error: "La unidad de medida es obligatoria.",
    })
    .min(1, "La unidad no puede estar vacía."), // ✨ MEJORA: Evita strings vacíos.
});

/**
 * @description Esquema para la CREACIÓN de un nuevo pedido.
 * Sincronizado con los campos que la API route realmente utiliza.
 */
export const createOrderSchema = z.object({
  customer_id: z
    .number({
      required_error: "El cliente es requerido.",
    })
    .int()
    .positive("El ID de cliente debe ser un entero positivo."),

  total: z.number().nonnegative("El total no puede ser negativo."),

  destination_id: z.number().int().positive().nullable().optional(),

  items: z
    .array(createOrderItemSchema)
    .min(1, "El pedido debe tener al menos un producto."),
});

/**
 * @description Esquema para la CREACIÓN de un nuevo despacho (viaje).
 */
export const createDeliverySchema = z.object({
  order_id: z.number().int().positive("El ID del pedido es obligatorio."),
  truck_id: z.number().int().positive("El ID del camión es obligatorio."),
  driver_id: z.number().int().positive("El ID del conductor es obligatorio."),
});

/**
 * @description Esquema para la CONFIRMACIÓN de carga de un despacho.
 */
export const confirmLoadSchema = z.object({
  notes: z.string().optional(),
  loadPhoto: z.any().refine((file) => file, "La foto de carga es obligatoria."),
  loadedItems: z
    .array(
      z.object({
        pedido_item_id: z.string(),
        dispatched_quantity: z
          .number()
          .min(0, "La cantidad no puede ser negativa."),
      })
    )
    .min(1, "Debe haber al menos un item a despachar.")
    .refine((items) => items.some((item) => item.dispatched_quantity > 0), {
      message:
        "Debes ingresar una cantidad a cargar mayor a cero para al menos un item.",
    }),
});
