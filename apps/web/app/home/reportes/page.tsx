import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { formatDate, formatMoney } from '~/lib/format';

import { ReportesFilters } from './_components/reportes-filters';

export const metadata = { title: 'Reportes' };

const CATEGORIA_LABEL: Record<string, string> = {
  deposito: 'Depósito',
  renta: 'Renta',
  mora: 'Mora',
  gasto: 'Gasto',
  ajuste: 'Ajuste',
  pago: 'Pago',
};
const PRIORIDAD_LABEL: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};
const ESTADO_INC_LABEL: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  resuelta: 'Resuelta',
};

type Reporte = {
  headers: string[];
  rows: string[][];
  totals: { label: string; value: string }[];
};

async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tipo = sp.tipo ?? 'ingresos';
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = sp.desde ?? hoy.slice(0, 8) + '01';
  const hasta = sp.hasta ?? hoy;

  const client = getSupabaseServerClient();

  const [propRes, inqRes, conRes] = await Promise.all([
    client.from('propiedades').select('id, alias'),
    client.from('inquilinos').select('id, nombre'),
    client.from('contratos').select('id, propiedad_id, inquilino_id, estado'),
  ]);

  const propById = new Map((propRes.data ?? []).map((p) => [p.id, p.alias]));
  const inqById = new Map((inqRes.data ?? []).map((i) => [i.id, i.nombre]));
  const conById = new Map(
    (conRes.data ?? []).map((c) => [
      c.id,
      {
        propiedad: propById.get(c.propiedad_id) ?? '—',
        inquilino: inqById.get(c.inquilino_id) ?? '—',
        estado: c.estado,
      },
    ]),
  );

  const reporte = await buildReporte();

  async function buildReporte(): Promise<Reporte> {
    if (tipo === 'ingresos') {
      const { data } = await client
        .from('transacciones')
        .select('fecha, concepto, metodo_pago, monto, contrato_id')
        .eq('tipo', 'abono')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: true });

      const rows = (data ?? []).map((t) => {
        const c = conById.get(t.contrato_id);
        return [
          formatDate(t.fecha),
          c?.propiedad ?? '—',
          c?.inquilino ?? '—',
          t.concepto,
          t.metodo_pago ?? '—',
          formatMoney(t.monto),
        ];
      });
      const total = (data ?? []).reduce((s, t) => s + Number(t.monto), 0);
      return {
        headers: ['Fecha', 'Propiedad', 'Inquilino', 'Concepto', 'Método', 'Monto'],
        rows,
        totals: [{ label: 'Total ingresos', value: formatMoney(total) }],
      };
    }

    if (tipo === 'morosidad') {
      const { data } = await client
        .from('transacciones')
        .select('contrato_id, tipo, monto, categoria, fecha')
        .neq('categoria', 'deposito')
        .lte('fecha', hasta);

      const netByContrato = new Map<string, number>();
      for (const t of data ?? []) {
        const cur = netByContrato.get(t.contrato_id) ?? 0;
        netByContrato.set(
          t.contrato_id,
          cur + (t.tipo === 'cargo' ? Number(t.monto) : -Number(t.monto)),
        );
      }

      const morosos = [...netByContrato.entries()].filter(([, v]) => v > 0);
      const rows = morosos.map(([cid, v]) => {
        const c = conById.get(cid);
        return [
          c?.propiedad ?? '—',
          c?.inquilino ?? '—',
          c?.estado === 'activo' ? 'Activo' : 'Finalizado',
          formatMoney(v),
        ];
      });
      const total = morosos.reduce((s, [, v]) => s + v, 0);
      return {
        headers: ['Propiedad', 'Inquilino', 'Contrato', 'Adeudo'],
        rows,
        totals: [{ label: 'Total adeudado', value: formatMoney(total) }],
      };
    }

    if (tipo === 'incidencias') {
      const { data } = await client
        .from('incidencias')
        .select('titulo, propiedad_id, prioridad, estado, costo, created_at')
        .gte('created_at', desde)
        .lte('created_at', hasta + 'T23:59:59')
        .order('created_at', { ascending: true });

      const rows = (data ?? []).map((i) => [
        formatDate(i.created_at.slice(0, 10)),
        i.titulo,
        propById.get(i.propiedad_id) ?? '—',
        PRIORIDAD_LABEL[i.prioridad] ?? i.prioridad,
        ESTADO_INC_LABEL[i.estado] ?? i.estado,
        formatMoney(i.costo),
      ]);
      const total = (data ?? []).reduce((s, i) => s + Number(i.costo), 0);
      return {
        headers: ['Fecha', 'Título', 'Propiedad', 'Prioridad', 'Estado', 'Costo'],
        rows,
        totals: [{ label: 'Total incidencias', value: formatMoney(total) }],
      };
    }

    // movimientos
    const { data } = await client
      .from('transacciones')
      .select('fecha, concepto, categoria, tipo, monto, contrato_id')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: true });

    const rows = (data ?? []).map((t) => {
      const c = conById.get(t.contrato_id);
      return [
        formatDate(t.fecha),
        c?.propiedad ?? '—',
        t.concepto,
        CATEGORIA_LABEL[t.categoria] ?? t.categoria,
        t.tipo === 'cargo' ? formatMoney(t.monto) : '—',
        t.tipo === 'abono' ? formatMoney(t.monto) : '—',
      ];
    });
    const cargos = (data ?? [])
      .filter((t) => t.tipo === 'cargo')
      .reduce((s, t) => s + Number(t.monto), 0);
    const abonos = (data ?? [])
      .filter((t) => t.tipo === 'abono')
      .reduce((s, t) => s + Number(t.monto), 0);
    return {
      headers: ['Fecha', 'Propiedad', 'Concepto', 'Categoría', 'Cargo', 'Abono'],
      rows,
      totals: [
        { label: 'Total cargos', value: formatMoney(cargos) },
        { label: 'Total abonos', value: formatMoney(abonos) },
      ],
    };
  }

  return (
    <>
      <PageHeader title={'Reportes'} description={'Ingresos, morosidad e incidencias'} />

      <PageBody>
        <div className={'flex flex-col space-y-6'}>
          <ReportesFilters tipo={tipo} desde={desde} hasta={hasta} />

          <div className={'rounded-md border'}>
            <Table>
              <TableHeader>
                <TableRow>
                  {reporte.headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reporte.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={reporte.headers.length}
                      className={'text-muted-foreground text-center'}
                    >
                      Sin resultados para el periodo seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  reporte.rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {row.map((cell, i) => (
                        <TableCell key={i}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className={'flex flex-wrap gap-6'}>
            {reporte.totals.map((tot) => (
              <div key={tot.label} className={'flex flex-col'}>
                <span className={'text-muted-foreground text-sm'}>
                  {tot.label}
                </span>
                <span className={'text-xl font-bold'}>{tot.value}</span>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default ReportesPage;
