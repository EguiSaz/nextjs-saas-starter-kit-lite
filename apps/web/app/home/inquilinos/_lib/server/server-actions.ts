'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  DeleteInquilinoSchema,
  InquilinoSchema,
} from '../schema/inquilino.schema';

const nullify = (value?: string | null) =>
  value && value.trim() !== '' ? value.trim() : null;

export const saveInquilinoAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const payload = {
      organization_id: organization.id,
      nombre: data.nombre.trim(),
      email: nullify(data.email),
      telefono: nullify(data.telefono),
      identificacion: nullify(data.identificacion),
      contacto_emergencia: nullify(data.contacto_emergencia),
      notas: nullify(data.notas),
    };

    if (data.id) {
      const { error } = await client
        .from('inquilinos')
        .update(payload)
        .eq('id', data.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('inquilinos').insert(payload);

      if (error) {
        throw error;
      }
    }

    revalidatePath('/home/inquilinos');

    return { success: true };
  },
  { schema: InquilinoSchema },
);

export const deleteInquilinoAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { error } = await client
      .from('inquilinos')
      .delete()
      .eq('id', data.id);

    if (error) {
      // FK RESTRICT desde contratos (Módulo 3)
      if (error.code === '23503') {
        throw new Error(
          'No se puede eliminar: el inquilino tiene contratos asociados.',
        );
      }

      throw error;
    }

    revalidatePath('/home/inquilinos');

    return { success: true };
  },
  { schema: DeleteInquilinoSchema },
);
