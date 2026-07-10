'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  DeletePropiedadSchema,
  PropiedadSchema,
} from '../schema/propiedad.schema';

const nullify = (value?: string | null) =>
  value && value.trim() !== '' ? value.trim() : null;

export const savePropiedadAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const payload = {
      organization_id: organization.id,
      arrendador_id: data.arrendador_id,
      alias: data.alias.trim(),
      direccion: data.direccion.trim(),
      tipo: data.tipo,
      habitaciones: data.habitaciones,
      banos: data.banos,
      metros_cuadrados: data.metros_cuadrados,
      estado: data.estado,
      notas: nullify(data.notas),
    };

    if (data.id) {
      const { error } = await client
        .from('propiedades')
        .update(payload)
        .eq('id', data.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('propiedades').insert(payload);

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'El arrendador seleccionado no pertenece a esta organización.',
          );
        }

        throw error;
      }
    }

    revalidatePath('/home/propiedades');

    return { success: true };
  },
  { schema: PropiedadSchema },
);

export const deletePropiedadAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client
      .from('propiedades')
      .delete()
      .eq('id', data.id);

    if (error) {
      if (error.code === '23503') {
        throw new Error(
          'No se puede eliminar: la propiedad tiene contratos asociados.',
        );
      }

      throw error;
    }

    revalidatePath('/home/propiedades');

    return { success: true };
  },
  { schema: DeletePropiedadSchema },
);
