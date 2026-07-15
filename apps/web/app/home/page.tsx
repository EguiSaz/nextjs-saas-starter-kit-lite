import Link from 'next/link';

import { Building2, FileText, Wrench } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { formatMoney } from '~/lib/format';

async function HomePage() {
  const client = getSupabaseServerClient();

  const [contratosRes, propiedadesRes, incidenciasRes, inquilinosRes] =
    await Promise.all([
      client
        .from('contratos')
        .select('id, estado, saldo, propiedad_id, inquilino_id'),
      client.from('propiedades').select('id, alias, estado'),
      client.from('incidencias').select('id, estado'),
      client.from('inquilinos').select('id, nombre'),
    ]);

  if (contratosRes.error) throw contratosRes.error;
  if (propiedadesRes.error) throw propiedadesRes.error;
  if (incidenciasRes.error) throw incidenciasRes.error;
  if (inquilinosRes.error) throw inquilinosRes.error;

  const contratos = contratosRes.data ?? [];
  const propiedades = propiedadesRes.data ?? [];
  const incidencias = incidenciasRes.data ?? [];

  const propById = new Map(propiedades.map((p) => [p.id, p.alias]));
  const inqById = new Map(
    (inquilinosRes.data ?? []).map((i) => [i.id, i.nombre]),
  );

  const activos = contratos.filter((c) => c.estado === 'activo');
  const porCobrar = activos.reduce(
    (sum, c) => sum + Math.max(Number(c.saldo), 0),
    0,
  );
  const ocupadas = propiedades.filter((p) => p.estado === 'ocupada').length;
  const disponibles = propiedades.filter(
    (p) => p.estado === 'disponible',
  ).length;
  const incidenciasAbiertas = incidencias.filter(
    (i) => i.estado !== 'resuelta',
  ).length;

  const porCobrarLista = activos
    .filter((c) => Number(c.saldo) > 0)
    .sort((a, b) => Number(b.saldo) - Number(a.saldo));

  const stats = [
    {
      label: 'Contratos activos',
      value: String(activos.length),
      icon: <FileText className={'text-muted-foreground w-5'} />,
    },
    {
      label: 'Por cobrar',
      value: formatMoney(porCobrar),
      icon: <FileText className={'text-muted-foreground w-5'} />,
    },
    {
      label: 'Propiedades ocupadas',
      value: `${ocupadas} / ${propiedades.length}`,
      icon: <Building2 className={'text-muted-foreground w-5'} />,
    },
    {
      label: 'Incidencias abiertas',
      value: String(incidenciasAbiertas),
      icon: <Wrench className={'text-muted-foreground w-5'} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={'Inicio'}
        description={'Resumen de tu operación'}
      />

      <PageBody>
        <div className={'flex flex-col space-y-6'}>
          <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader
                  className={'flex flex-row items-center justify-between pb-2'}
                >
                  <CardTitle className={'text-sm font-medium'}>
                    {stat.label}
                  </CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent className={'text-2xl font-bold'}>
                  {stat.value}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contratos por cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              {porCobrarLista.length === 0 ? (
                <p className={'text-muted-foreground text-sm'}>
                  {activos.length === 0
                    ? 'Aún no tienes contratos activos.'
                    : 'Ningún contrato tiene saldo pendiente. ¡Al corriente!'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propiedad</TableHead>
                      <TableHead>Inquilino</TableHead>
                      <TableHead className={'text-right'}>Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCobrarLista.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className={'font-medium'}>
                          <Link
                            href={`/home/contratos/${c.id}`}
                            className={'hover:underline'}
                          >
                            {propById.get(c.propiedad_id) ?? '—'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {inqById.get(c.inquilino_id) ?? '—'}
                        </TableCell>
                        <TableCell className={'text-right'}>
                          <Badge variant={'secondary'}>
                            {formatMoney(c.saldo)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className={'text-muted-foreground text-sm'}>
            {disponibles} propiedad(es) disponible(s) para rentar.
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default HomePage;
