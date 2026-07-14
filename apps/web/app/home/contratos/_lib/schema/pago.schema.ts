import { z } from 'zod';

export const RegistrarPagoSchema = z.object({
  contrato_id: z.string().uuid(),
  monto: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0'),
  mora: z.coerce
    .number({ invalid_type_error: 'La mora debe ser un número' })
    .min(0)
    .optional(),
  metodo_pago: z.string().trim().max(100).optional().or(z.literal('')),
  fecha: z.string().optional(),
});

export type RegistrarPagoValues = z.infer<typeof RegistrarPagoSchema>;

export const CATEGORIAS_CARGO = ['ajuste', 'gasto', 'mora'] as const;

export const RegistrarCargoSchema = z.object({
  contrato_id: z.string().uuid(),
  categoria: z.enum(CATEGORIAS_CARGO),
  concepto: z.string().trim().min(2, 'El concepto es obligatorio').max(255),
  monto: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0'),
  fecha: z.string().optional(),
});

export type RegistrarCargoValues = z.infer<typeof RegistrarCargoSchema>;
