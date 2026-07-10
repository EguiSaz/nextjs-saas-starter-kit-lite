import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { PropiedadesList } from './_components/propiedades-list';

export const metadata = {
  title: 'Propiedades',
};

async function PropiedadesPage() {
  const client = getSupabaseServerClient();

  const [propiedades, arrendadores] = await Promise.all([
    client
      .from('propiedades')
      .select('*')
      .order('alias', { ascending: true }),
    client
      .from('arrendadores')
      .select('id, nombre')
      .order('nombre', { ascending: true }),
  ]);

  if (propiedades.error) {
    throw propiedades.error;
  }

  if (arrendadores.error) {
    throw arrendadores.error;
  }

  return (
    <>
      <PageHeader
        title={'Propiedades'}
        description={'Inmuebles administrados'}
      />

      <PageBody>
        <PropiedadesList
          propiedades={propiedades.data ?? []}
          arrendadores={arrendadores.data ?? []}
        />
      </PageBody>
    </>
  );
}

export default PropiedadesPage;
