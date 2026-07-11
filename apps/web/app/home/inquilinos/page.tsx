import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { InquilinosList } from './_components/inquilinos-list';

export const metadata = {
  title: 'Inquilinos',
};

async function InquilinosPage() {
  const client = getSupabaseServerClient();

  const { data: inquilinos, error } = await client
    .from('inquilinos')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <>
      <PageHeader
        title={'Inquilinos'}
        description={'Arrendatarios registrados'}
      />

      <PageBody>
        <InquilinosList inquilinos={inquilinos ?? []} />
      </PageBody>
    </>
  );
}

export default InquilinosPage;
