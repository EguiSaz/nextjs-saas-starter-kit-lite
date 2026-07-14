'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  DeleteIncidenciaSchema,
  FacturarIncidenciaSchema,
  IncidenciaSchema,
} from '../schema/incidencia.schema';

const hoy = () => new Date().toISOString().slice(0, 10);
const nullify = (v?: string | null) =>
  v && v.trim() !== '' ? v.trim() : null;

export const saveIncidenciaAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const contratoId = nullify(data.contrato_id);
    const resuelta = data.estado === 'resuelta';

    if (data.id) {
      // Proteger los campos financieros si ya fue facturada
      const { data: existing, error: fetchError } = await client
        .from('incidencias')
        .select('transaccion_id, costo, responsable, fecha_resolucion')
        .eq('id', data.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const facturada = existing.transaccion_id != null;

      const { error } = await client
        .from('incidencias')
        .update({
          propiedad_id: data.propiedad_id,
          contrato_id: contratoId,
          titulo: data.titulo.trim(),
          descripcion: nullify(data.descripcion),
          costo: facturada ? existing.costo : data.costo,
          responsable: facturada ? existing.responsable : data.responsable,
          prioridad: data.prioridad,
          estado: data.estado,
          fecha_resolucion: resuelta
            ? (existing.fecha_resolucion ?? hoy())
            : null,
        })
        .eq('id', data.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('incidencias').insert({
        organization_id: organization.id,
        propiedad_id: data.propiedad_id,
        contrato_id: contratoId,
        titulo: data.titulo.trim(),
        descripcion: nullify(data.descripcion),
        costo: data.costo,
        responsable: data.responsable,
        prioridad: data.prioridad,
        estado: data.estado,
        fecha_resolucion: resuelta ? hoy() : null,
      });

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'La propiedad o el contrato no pertenecen a esta organización.',
          );
        }
        throw error;
      }
    }

    revalidatePath('/home/incidencias');

    return { success: true };
  },
  { schema: IncidenciaSchema },
);

export const facturarIncidenciaAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client.rpc('facturar_incidencia', {
      p_incidencia_id: data.id,
    });

    if (error) {
      // Los mensajes vienen en español desde la función de Postgres
      throw new Error(error.message);
    }

    revalidatePath('/home/incidencias');
    revalidatePath('/home/contratos');

    return { success: true };
  },
  { schema: FacturarIncidenciaSchema },
);

export const deleteIncidenciaAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client
      .from('incidencias')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw error;
    }

    revalidatePath('/home/incidencias');

    return { success: true };
  },
  { schema: DeleteIncidenciaSchema },
);
