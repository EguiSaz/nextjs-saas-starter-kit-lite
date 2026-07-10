import { z } from 'zod';

export const ArrendadorSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(255),
  email: z
    .string()
    .trim()
    .email('Email inválido')
    .max(320)
    .optional()
    .or(z.literal('')),
  telefono: z.string().trim().max(50).optional().or(z.literal('')),
  identificacion: z.string().trim().max(50).optional().or(z.literal('')),
  cuenta_bancaria: z.string().trim().max(50).optional().or(z.literal('')),
  comision_pct: z.coerce
    .number({ invalid_type_error: 'La comisión debe ser un número' })
    .min(0, 'Mínimo 0%')
    .max(100, 'Máximo 100%'),
  notas: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type ArrendadorFormValues = z.infer<typeof ArrendadorSchema>;

export const DeleteArrendadorSchema = z.object({
  id: z.string().uuid(),
});
