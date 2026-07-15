import { z } from 'zod';

export const TIPOS_PROPIEDAD = [
  'departamento',
  'casa',
  'local',
  'oficina',
  'bodega',
  'terreno',
  'otro',
] as const;

export const ESTADOS_PROPIEDAD = ['disponible', 'ocupada', 'inactiva'] as const;

export const PropiedadSchema = z.object({
  id: z.string().uuid().optional(),
  arrendador_id: z.string().uuid('Selecciona un arrendador'),
  alias: z.string().trim().min(2, 'El alias es obligatorio').max(255),
  direccion: z.string().trim().min(2, 'La dirección es obligatoria'),
  tipo: z.enum(TIPOS_PROPIEDAD),
  habitaciones: z.number().int().min(0).nullable(),
  banos: z.number().int().min(0).nullable(),
  metros_cuadrados: z.number().min(0).nullable(),
  estado: z.enum(ESTADOS_PROPIEDAD),
  notas: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type PropiedadFormValues = z.infer<typeof PropiedadSchema>;

export const DeletePropiedadSchema = z.object({
  id: z.string().uuid(),
});
