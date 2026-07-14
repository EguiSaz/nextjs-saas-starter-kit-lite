import { z } from 'zod';

export const TIPOS_PLANTILLA = [
  'contrato',
  'recordatorio',
  'recibo',
  'otro',
] as const;

export const PlantillaSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(255),
  tipo: z.enum(TIPOS_PLANTILLA),
  contenido: z.string().max(50000).optional().or(z.literal('')),
});

export type PlantillaFormValues = z.infer<typeof PlantillaSchema>;

export const DeletePlantillaSchema = z.object({ id: z.string().uuid() });
