import { z } from 'zod';

export const CrearContratoSchema = z
  .object({
    propiedad_id: z.string().uuid('Selecciona una propiedad'),
    inquilino_id: z.string().uuid('Selecciona un inquilino'),
    fecha_inicio: z.string().min(1, 'Fecha de inicio obligatoria'),
    fecha_fin: z.string().min(1, 'Fecha de fin obligatoria'),
    renta_mensual: z.coerce
      .number({ invalid_type_error: 'La renta debe ser un número' })
      .positive('La renta debe ser mayor a 0'),
    deposito: z.coerce
      .number({ invalid_type_error: 'El depósito debe ser un número' })
      .min(0, 'El depósito no puede ser negativo'),
    dia_pago: z.coerce
      .number({ invalid_type_error: 'El día debe ser un número' })
      .int()
      .min(1, 'Entre 1 y 31')
      .max(31, 'Entre 1 y 31'),
  })
  .refine((d) => d.fecha_fin >= d.fecha_inicio, {
    message: 'La fecha de fin debe ser igual o posterior a la de inicio',
    path: ['fecha_fin'],
  });

export type CrearContratoValues = z.infer<typeof CrearContratoSchema>;

export const DESTINOS_DEPOSITO = ['integro', 'retenido', 'parcial'] as const;

export const CerrarContratoSchema = z
  .object({
    id: z.string().uuid(),
    destino_deposito: z.enum(DESTINOS_DEPOSITO),
    monto_retenido: z.coerce.number().min(0).optional(),
    fecha_cierre: z.string().optional(),
  })
  .refine(
    (d) =>
      d.destino_deposito !== 'parcial' ||
      (d.monto_retenido !== undefined && d.monto_retenido >= 0),
    {
      message: 'Indica el monto retenido',
      path: ['monto_retenido'],
    },
  );

export type CerrarContratoValues = z.infer<typeof CerrarContratoSchema>;
