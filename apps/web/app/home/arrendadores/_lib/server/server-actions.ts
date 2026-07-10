'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  ArrendadorSchema,
  DeleteArrendadorSchema,
} from '../schema/arrendador.schema';

const nullify = (value?: string | null) =>
  value && value.trim() !== '' ? value.trim() : null;

export const saveArrendadorAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const payload = {
      organization_id: organization.id,
      nombre: data.nombre.trim(),
      email: nullify(data.email),
      telefono: nullify(data.telefono),
      identificacion: nullify(data.identificacion),
      cuenta_bancaria: nullify(data.cuenta_bancaria),
      comision_pct: data.comision_pct,
      notas: nullify(data.notas),
    };

    if (data.id) {
      const { error } = await client
        .from('arrendadores')
        .update(payload)
        .eq('id', data.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('arrendadores').insert(payload);

      if (error) {
        throw error;
      }
    }

    revalidatePath('/home/arrendadores');

    return { success: true };
  },
  { schema: ArrendadorSchema },
);

export const deleteArrendadorAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client
      .from('arrendadores')
      .delete()
      .eq('id', data.id);

    if (error) {
      // FK RESTRICT desde propiedades (regla de negocio del MVP, ahora en BD)
      if (error.code === '23503') {
        throw new Error(
          'No se puede eliminar: el arrendador tiene propiedades asociadas.',
        );
      }

      throw error;
    }

    revalidatePath('/home/arrendadores');

    return { success: true };
  },
  { schema: DeleteArrendadorSchema },
);
