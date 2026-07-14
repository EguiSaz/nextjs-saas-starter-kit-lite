import { notFound } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { formatDate, formatMoney } from '~/lib/format';

import { CerrarContratoDialog } from '../_components/cerrar-contrato-dialog';
import { RegistrarCargoDialog } from '../_components/registrar-cargo-dialog';
import { RegistrarPagoDialog } from '../_components/registrar-pago-dialog';

const CATEGORIA_LABEL: Record<string, string> = {
  deposito: 'Depósito',
  renta: 'Renta',
  mora: 'Mora',
  gasto: 'Gasto',
  ajuste: 'Ajuste',
  pago: 'Pago',
};

async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getSupabaseServerClient();

  const { data: contrato, error } = await client
    .from('contratos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!contrato) notFound();

  const [propiedadRes, inquilinoRes, transaccionesRes] = await Promise.all([
    client
      .from('propiedades')
      .select('alias, direccion')
      .eq('id', contrato.propiedad_id)
      .maybeSingle(),
    client
      .from('inquilinos')
      .select('nombre')
      .eq('id', contrato.inquilino_id)
      .maybeSingle(),
    client
      .from('transacciones')
      .select('*')
      .eq('contrato_id', id)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const transacciones = transaccionesRes.data ?? [];
  const activo = contrato.estado === 'activo';

  return (
    <>
      <PageHeader
        title={propiedadRes.data?.alias ?? 'Contrato'}
        description={inquilinoRes.data?.nombre ?? ''}
      >
        {activo ? (
          <div className={'flex flex-wrap items-center gap-2'}>
            <RegistrarPagoDialog
              contratoId={contrato.id}
              saldo={Number(contrato.saldo)}
            />
            <RegistrarCargoDialog contratoId={contrato.id} />
            <CerrarContratoDialog
              contratoId={contrato.id}
              deposito={Number(contrato.deposito)}
            />
          </div>
        ) : null}
      </PageHeader>

      <PageBody>
        <div className={'flex flex-col space-y-6'}>
          <div className={'grid gap-4 md:grid-cols-4'}>
            <Card>
              <CardHeader className={'pb-2'}>
                <CardTitle className={'text-sm font-medium'}>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={activo ? 'default' : 'secondary'}>
                  {activo ? 'Activo' : 'Finalizado'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className={'pb-2'}>
                <CardTitle className={'text-sm font-medium'}>
                  Saldo (adeudo)
                </CardTitle>
              </CardHeader>
              <CardContent className={'text-2xl font-bold'}>
                {formatMoney(contrato.saldo)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className={'pb-2'}>
                <CardTitle className={'text-sm font-medium'}>
                  Renta mensual
                </CardTitle>
              </CardHeader>
              <CardContent className={'text-2xl font-bold'}>
                {formatMoney(contrato.renta_mensual)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className={'pb-2'}>
                <CardTitle className={'text-sm font-medium'}>Depósito</CardTitle>
              </CardHeader>
              <CardContent className={'text-2xl font-bold'}>
                {formatMoney(contrato.deposito)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Términos</CardTitle>
            </CardHeader>
            <CardContent
              className={'text-muted-foreground grid gap-2 text-sm md:grid-cols-2'}
            >
              <div>Propiedad: {propiedadRes.data?.alias ?? '—'}</div>
              <div>Dirección: {propiedadRes.data?.direccion ?? '—'}</div>
              <div>Inquilino: {inquilinoRes.data?.nombre ?? '—'}</div>
              <div>Día de pago: {contrato.dia_pago}</div>
              <div>Inicio: {formatDate(contrato.fecha_inicio)}</div>
              <div>Fin: {formatDate(contrato.fecha_fin)}</div>
              {contrato.fecha_cierre ? (
                <div>Cierre: {formatDate(contrato.fecha_cierre)}</div>
              ) : null}
              {contrato.deposito_retenido != null ? (
                <div>
                  Depósito retenido: {formatMoney(contrato.deposito_retenido)}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos (ledger)</CardTitle>
            </CardHeader>
            <CardContent>
              {transacciones.length === 0 ? (
                <p className={'text-muted-foreground text-sm'}>
                  Sin movimientos.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className={'text-right'}>Cargo</TableHead>
                      <TableHead className={'text-right'}>Abono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.fecha)}</TableCell>
                        <TableCell>{t.concepto}</TableCell>
                        <TableCell>
                          {CATEGORIA_LABEL[t.categoria] ?? t.categoria}
                        </TableCell>
                        <TableCell className={'text-right'}>
                          {t.tipo === 'cargo' ? formatMoney(t.monto) : '—'}
                        </TableCell>
                        <TableCell className={'text-right'}>
                          {t.tipo === 'abono' ? formatMoney(t.monto) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

export default ContratoDetailPage;
