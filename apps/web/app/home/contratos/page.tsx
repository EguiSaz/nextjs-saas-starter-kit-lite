import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { ContratosList } from './_components/contratos-list';

export const metadata = {
  title: 'Contratos',
};

async function ContratosPage() {
  const client = getSupabaseServerClient();

  const [contratosRes, propiedadesRes, inquilinosRes] = await Promise.all([
    client
      .from('contratos')
      .select('id, estado, renta_mensual, saldo, propiedad_id, inquilino_id')
      .order('created_at', { ascending: false }),
    client.from('propiedades').select('id, alias, estado').order('alias'),
    client.from('inquilinos').select('id, nombre').order('nombre'),
  ]);

  if (contratosRes.error) throw contratosRes.error;
  if (propiedadesRes.error) throw propiedadesRes.error;
  if (inquilinosRes.error) throw inquilinosRes.error;

  const propById = new Map(
    (propiedadesRes.data ?? []).map((p) => [p.id, p.alias]),
  );
  const inqById = new Map(
    (inquilinosRes.data ?? []).map((i) => [i.id, i.nombre]),
  );

  const contratos = (contratosRes.data ?? []).map((c) => ({
    id: c.id,
    estado: c.estado,
    renta_mensual: Number(c.renta_mensual),
    saldo: Number(c.saldo),
    propiedad_alias: propById.get(c.propiedad_id) ?? '—',
    inquilino_nombre: inqById.get(c.inquilino_id) ?? '—',
  }));

  const propiedadesDisponibles = (propiedadesRes.data ?? [])
    .filter((p) => p.estado === 'disponible')
    .map((p) => ({ id: p.id, label: p.alias }));

  const inquilinos = (inquilinosRes.data ?? []).map((i) => ({
    id: i.id,
    label: i.nombre,
  }));

  return (
    <>
      <PageHeader title={'Contratos'} description={'Arrendamientos'} />

      <PageBody>
        <ContratosList
          contratos={contratos}
          propiedadesDisponibles={propiedadesDisponibles}
          inquilinos={inquilinos}
        />
      </PageBody>
    </>
  );
}

export default ContratosPage;
