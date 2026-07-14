import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { IncidenciasList } from './_components/incidencias-list';

export const metadata = {
  title: 'Incidencias',
};

async function IncidenciasPage() {
  const client = getSupabaseServerClient();

  const [incRes, propRes, conRes, inqRes] = await Promise.all([
    client
      .from('incidencias')
      .select('*')
      .order('created_at', { ascending: false }),
    client.from('propiedades').select('id, alias').order('alias'),
    client
      .from('contratos')
      .select('id, propiedad_id, inquilino_id')
      .eq('estado', 'activo'),
    client.from('inquilinos').select('id, nombre'),
  ]);

  if (incRes.error) throw incRes.error;
  if (propRes.error) throw propRes.error;
  if (conRes.error) throw conRes.error;
  if (inqRes.error) throw inqRes.error;

  const propById = new Map((propRes.data ?? []).map((p) => [p.id, p.alias]));
  const inqById = new Map((inqRes.data ?? []).map((i) => [i.id, i.nombre]));

  const incidencias = (incRes.data ?? []).map((i) => ({
    ...i,
    propiedad_alias: propById.get(i.propiedad_id) ?? '—',
  }));

  const propiedades = (propRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.alias,
  }));

  const contratos = (conRes.data ?? []).map((c) => ({
    id: c.id,
    label: `${propById.get(c.propiedad_id) ?? ''} — ${
      inqById.get(c.inquilino_id) ?? ''
    }`,
  }));

  return (
    <>
      <PageHeader
        title={'Incidencias'}
        description={'Mantenimiento y gastos de las propiedades'}
      />

      <PageBody>
        <IncidenciasList
          incidencias={incidencias}
          propiedades={propiedades}
          contratos={contratos}
        />
      </PageBody>
    </>
  );
}

export default IncidenciasPage;
