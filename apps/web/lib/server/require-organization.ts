import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * @name getCurrentOrganization
 * @description Resuelve la organización (tenant) activa del usuario autenticado.
 * Bajo RLS, `organizations` solo devuelve las organizaciones del usuario, así que
 * tomamos la primera (por ahora cada usuario tiene una organización por defecto
 * creada en el onboarding). Cacheado por request.
 */
export const getCurrentOrganization = cache(async () => {
  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('organizations')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
});

/**
 * @name requireCurrentOrganization
 * @description Igual que getCurrentOrganization pero lanza si no hay organización.
 */
export async function requireCurrentOrganization() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    throw new Error('No se encontró una organización activa para el usuario.');
  }

  return organization;
}
