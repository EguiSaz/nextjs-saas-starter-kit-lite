import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { ArrendadoresList } from './_components/arrendadores-list';

export const metadata = {
  title: 'Arrendadores',
};

async function ArrendadoresPage() {
  const client = getSupabaseServerClient();

  const { data: arrendadores, error } = await client
    .from('arrendadores')
    .select('*')
    .order('es_propio', { ascending: false })
    .order('nombre', { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <>
      <PageHeader
        title={'Arrendadores'}
        description={'Dueños de inmuebles y su comisión'}
      />

      <PageBody>
        <ArrendadoresList arrendadores={arrendadores ?? []} />
      </PageBody>
    </>
  );
}

export default ArrendadoresPage;
