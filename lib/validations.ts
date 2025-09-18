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

/**
 * @description Esquema para la CONFIRMACIÓN de salida de un despacho por seguridad.
 */
export const confirmExitSchema = z.object({
  notes: z.string().optional(),
  exitPhoto: z
    .any()
    .refine(
      (file) => file instanceof File,
      "La foto de salida es obligatoria."
    ),
});

/**
 * @description Esquema para la CREACIÓN y ACTUALIZACIÓN de un cliente.
 * Define las reglas de validación para el formulario de clientes.
 */
export const customerSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio." })
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .trim(),
  rif: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)), // Transforma "" a undefined
  address: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  email: z
    .string()
    .email("El formato del email no es válido.")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  phone: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});
/**
 * @description Esquema para la CREACIÓN y ACTUALIZACIÓN de un destino.
 */
export const destinationSchema = z.object({
  name: z
    .string({ required_error: "El nombre del destino es obligatorio." })
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .trim(),
  direccion: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)), // Transforma "" a undefined
  customer_id: z.coerce // ✨ Coerce convierte el string del select a número
    .number({
      required_error: "Debes seleccionar un cliente.",
      invalid_type_error: "El ID de cliente debe ser un número.",
    })
    .positive("Debes seleccionar un cliente."),
});

/**
 * @description Esquema para la CREACIÓN y ACTUALIZACIÓN de un chofer.
 */
export const driverSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio." })
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .trim(),
  docId: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  phone: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  customer_ids: z.array(z.number()).optional().default([]),
});

/**
 * @description Esquema para la CREACIÓN y ACTUALIZACIÓN de un camión (truck).
 */
export const truckSchema = z.object({
  // Corregido: 'placa' en lugar de 'plate'
  placa: z
    .string({ required_error: "La placa es obligatoria." })
    .min(3, "La placa debe tener al menos 3 caracteres.")
    .trim(),
  brand: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  model: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  // Tu código usaba 'capacity'. Lo mantenemos para consistencia.
  capacity: z.coerce
    .number({ invalid_type_error: "La capacidad debe ser un número." })
    .positive("La capacidad debe ser un valor positivo.")
    .optional(),
});

const userRoles = z.enum(["ADMIN", "CASHIER", "YARD", "SECURITY", "REPORTS"]);

/**
 * @description Esquema base para los datos de un usuario.
 */
const userBaseSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio." })
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .trim(),
  email: z
    .string({ required_error: "El email es obligatorio." })
    .email("El formato del email no es válido.")
    .trim(),
  role: userRoles,
});

/**
 * @description Esquema para la CREACIÓN de un nuevo usuario.
 * La contraseña es obligatoria y debe tener al menos 6 caracteres.
 */
export const createUserSchema = userBaseSchema.extend({
  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(6, "La contraseña debe tener al menos 6 caracteres."),
});

/**
 * @description Esquema para la ACTUALIZACIÓN de un usuario.
 * La contraseña es opcional. Si se proporciona, debe tener al menos 6 caracteres.
 */
export const updateUserSchema = userBaseSchema.extend({
  password: z
    .string()
    .refine((val) => val === undefined || val === "" || val.length >= 6, {
      message: "La nueva contraseña debe tener al menos 6 caracteres.",
    })
    .optional()
    .transform((val) => (val === "" ? undefined : val)), // Transforma "" a undefined para la API
});
