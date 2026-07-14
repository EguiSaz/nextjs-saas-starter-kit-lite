import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { PlantillasList } from './_components/plantillas-list';

export const metadata = {
  title: 'Plantillas',
};

async function PlantillasPage() {
  const client = getSupabaseServerClient();

  const { data: plantillas, error } = await client
    .from('plantillas')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <>
      <PageHeader
        title={'Plantillas'}
        description={'Documentos reutilizables (contratos, recordatorios, recibos)'}
      />

      <PageBody>
        <PlantillasList plantillas={plantillas ?? []} />
      </PageBody>
    </>
  );
}

export default PlantillasPage;
