'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

export const generarCargosDelMesAction = enhanceAction(
  async () => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const periodo = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const { data, error } = await client.rpc('generar_cargos_renta', {
      p_periodo: periodo,
      p_organization_id: organization.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/home/contratos');
    revalidatePath('/home');

    return { success: true, generados: data ?? 0, periodo };
  },
  {},
);
