'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  DeletePlantillaSchema,
  PlantillaSchema,
} from '../schema/plantilla.schema';

const nullify = (v?: string | null) =>
  v && v.trim() !== '' ? v : null;

export const savePlantillaAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const payload = {
      organization_id: organization.id,
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      contenido: nullify(data.contenido),
    };

    if (data.id) {
      const { error } = await client
        .from('plantillas')
        .update(payload)
        .eq('id', data.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('plantillas').insert(payload);

      if (error) {
        throw error;
      }
    }

    revalidatePath('/home/plantillas');

    return { success: true };
  },
  { schema: PlantillaSchema },
);

export const deletePlantillaAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client
      .from('plantillas')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw error;
    }

    revalidatePath('/home/plantillas');

    return { success: true };
  },
  { schema: DeletePlantillaSchema },
);
