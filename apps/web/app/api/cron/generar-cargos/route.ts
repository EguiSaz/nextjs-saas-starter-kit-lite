import { NextResponse } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

/**
 * POST /api/cron/generar-cargos
 *
 * Genera los cargos de renta del mes en curso para TODAS las organizaciones.
 * Idempotente (llave contrato_id + periodo). Pensado para un cron externo:
 * requiere la cabecera `x-cron-secret` igual a la variable de entorno CRON_SECRET.
 * El agendado principal es pg_cron dentro de la base; este endpoint es opcional.
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const secret = request.headers.get('x-cron-secret');

    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return new Response('No autorizado', { status: 401 });
    }

    const periodo = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const client = getSupabaseServerAdminClient();

    const { data, error } = await client.rpc('generar_cargos_renta', {
      p_periodo: periodo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ periodo, generados: data ?? 0 });
  },
  { auth: false },
);
