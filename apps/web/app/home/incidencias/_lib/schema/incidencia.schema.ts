import { z } from 'zod';

export const PRIORIDADES = ['baja', 'media', 'alta'] as const;
export const ESTADOS_INCIDENCIA = ['abierta', 'en_progreso', 'resuelta'] as const;
export const RESPONSABLES = ['arrendador', 'inquilino'] as const;

export const IncidenciaSchema = z.object({
  id: z.string().uuid().optional(),
  propiedad_id: z.string().uuid('Selecciona una propiedad'),
  contrato_id: z.string().uuid().optional().or(z.literal('')),
  titulo: z.string().trim().min(2, 'El título es obligatorio').max(255),
  descripcion: z.string().trim().max(2000).optional().or(z.literal('')),
  costo: z.coerce
    .number({ invalid_type_error: 'El costo debe ser un número' })
    .min(0, 'El costo no puede ser negativo'),
  prioridad: z.enum(PRIORIDADES),
  estado: z.enum(ESTADOS_INCIDENCIA),
  responsable: z.enum(RESPONSABLES),
});

export type IncidenciaFormValues = z.infer<typeof IncidenciaSchema>;

export const FacturarIncidenciaSchema = z.object({ id: z.string().uuid() });
export const DeleteIncidenciaSchema = z.object({ id: z.string().uuid() });
