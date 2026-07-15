import { z } from 'zod';

export const InquilinoSchema = z.object({
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
  contacto_emergencia: z.string().trim().max(255).optional().or(z.literal('')),
  notas: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type InquilinoFormValues = z.infer<typeof InquilinoSchema>;

export const DeleteInquilinoSchema = z.object({
  id: z.string().uuid(),
});
