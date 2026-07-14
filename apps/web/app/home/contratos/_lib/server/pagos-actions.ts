'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@kit/supabase/database';

import {
  RegistrarCargoSchema,
  RegistrarPagoSchema,
} from '../schema/pago.schema';

const hoy = () => new Date().toISOString().slice(0, 10);

async function requireContratoActivo(
  client: SupabaseClient<Database>,
  id: string,
) {
  const { data, error } = await client
    .from('contratos')
    .select('id, organization_id, estado')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  if (data.estado !== 'activo') {
    throw new Error('El contrato está finalizado; no admite movimientos.');
  }

  return data;
}

export const registrarPagoAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const contrato = await requireContratoActivo(client, data.contrato_id);

    const fecha = data.fecha && data.fecha.trim() !== '' ? data.fecha : hoy();

    const movimientos: Database['public']['Tables']['transacciones']['Insert'][] =
      [];

    // MVP "mora": primero el cargo del recargo, luego el abono
    if (data.mora && data.mora > 0) {
      movimientos.push({
        organization_id: contrato.organization_id,
        contrato_id: contrato.id,
        tipo: 'cargo',
        categoria: 'mora',
        concepto: 'Recargo por mora',
        monto: data.mora,
        fecha,
      });
    }

    movimientos.push({
      organization_id: contrato.organization_id,
      contrato_id: contrato.id,
      tipo: 'abono',
      categoria: 'pago',
      concepto: 'Pago',
      monto: data.monto,
      fecha,
      metodo_pago:
        data.metodo_pago && data.metodo_pago.trim() !== ''
          ? data.metodo_pago.trim()
          : null,
    });

    const { error } = await client.from('transacciones').insert(movimientos);

    if (error) {
      throw error;
    }

    revalidatePath(`/home/contratos/${data.contrato_id}`);
    revalidatePath('/home/contratos');

    return { success: true };
  },
  { schema: RegistrarPagoSchema },
);

export const registrarCargoAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const contrato = await requireContratoActivo(client, data.contrato_id);

    const fecha = data.fecha && data.fecha.trim() !== '' ? data.fecha : hoy();

    const { error } = await client.from('transacciones').insert({
      organization_id: contrato.organization_id,
      contrato_id: contrato.id,
      tipo: 'cargo',
      categoria: data.categoria,
      concepto: data.concepto.trim(),
      monto: data.monto,
      fecha,
    });

    if (error) {
      throw error;
    }

    revalidatePath(`/home/contratos/${data.contrato_id}`);
    revalidatePath('/home/contratos');

    return { success: true };
  },
  { schema: RegistrarCargoSchema },
);
