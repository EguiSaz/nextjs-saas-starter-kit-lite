'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { generarCargosDelMesAction } from '../_lib/server/cron-actions';

export function GenerarCargosButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);

    const promise = generarCargosDelMesAction(undefined)
      .then((res) => {
        router.refresh();
        return res;
      })
      .finally(() => setLoading(false));

    toast.promise(promise, {
      loading: 'Generando cargos del mes…',
      success: (res) =>
        res.generados > 0
          ? `${res.generados} cargo(s) de renta generados`
          : 'No hay cargos pendientes por generar este mes',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo generar',
    });
  };

  return (
    <Button variant={'outline'} onClick={onClick} disabled={loading}>
      <CalendarClock className={'mr-2 w-4'} />
      Generar cargos del mes
    </Button>
  );
}
