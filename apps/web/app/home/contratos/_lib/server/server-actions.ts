'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireCurrentOrganization } from '~/lib/server/require-organization';

import {
  CerrarContratoSchema,
  CrearContratoSchema,
} from '../schema/contrato.schema';

export const crearContratoAction = enhanceAction(
  async (data) => {
    const organization = await requireCurrentOrganization();
    const client = getSupabaseServerClient();

    const { data: contrato, error } = await client
      .from('contratos')
      .insert({
        organization_id: organization.id,
        propiedad_id: data.propiedad_id,
        inquilino_id: data.inquilino_id,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        renta_mensual: data.renta_mensual,
        deposito: data.deposito,
        dia_pago: data.dia_pago,
      })
      .select('id')
      .single();

    if (error) {
      // índice único parcial: un solo contrato activo por propiedad
      if (error.code === '23505') {
        throw new Error('La propiedad ya tiene un contrato activo.');
      }
      // FK compuesta same-org
      if (error.code === '23503') {
        throw new Error(
          'La propiedad o el inquilino no pertenecen a esta organización.',
        );
      }

      throw error;
    }

    revalidatePath('/home/contratos');

    return { success: true, id: contrato.id };
  },
  { schema: CrearContratoSchema },
);

export const cerrarContratoAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    const { data: contrato, error: fetchError } = await client
      .from('contratos')
      .select('id, organization_id, estado, deposito')
      .eq('id', data.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (contrato.estado !== 'activo') {
      throw new Error('El contrato ya está finalizado.');
    }

    const deposito = Number(contrato.deposito);

    let retenido = 0;

    if (data.destino_deposito === 'retenido') {
      retenido = deposito;
    } else if (data.destino_deposito === 'parcial') {
      retenido = Math.min(data.monto_retenido ?? 0, deposito);
    }

    const devuelto = Number((deposito - retenido).toFixed(2));

    const fechaCierre =
      data.fecha_cierre && data.fecha_cierre.trim() !== ''
        ? data.fecha_cierre
        : new Date().toISOString().slice(0, 10);

    const { error: updateError } = await client
      .from('contratos')
      .update({
        estado: 'finalizado',
        fecha_cierre: fechaCierre,
        deposito_retenido: retenido,
      })
      .eq('id', data.id);

    if (updateError) {
      throw updateError;
    }

    // Movimientos de depósito (categoria 'deposito' -> excluida del saldo corriente)
    const movimientos = [];

    if (devuelto > 0) {
      movimientos.push({
        organization_id: contrato.organization_id,
        contrato_id: contrato.id,
        tipo: 'abono' as const,
        categoria: 'deposito' as const,
        concepto: 'Devolución de depósito',
        monto: devuelto,
        fecha: fechaCierre,
      });
    }

    if (retenido > 0) {
      movimientos.push({
        organization_id: contrato.organization_id,
        contrato_id: contrato.id,
        tipo: 'cargo' as const,
        categoria: 'deposito' as const,
        concepto: 'Depósito retenido',
        monto: retenido,
        fecha: fechaCierre,
      });
    }

    if (movimientos.length > 0) {
      const { error: txError } = await client
        .from('transacciones')
        .insert(movimientos);

      if (txError) {
        throw txError;
      }
    }

    revalidatePath('/home/contratos');
    revalidatePath(`/home/contratos/${data.id}`);

    return { success: true };
  },
  { schema: CerrarContratoSchema },
);
