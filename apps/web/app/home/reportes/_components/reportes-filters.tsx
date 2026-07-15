'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

export const TIPOS_REPORTE = [
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'morosidad', label: 'Morosidad' },
  { value: 'incidencias', label: 'Incidencias' },
  { value: 'movimientos', label: 'Movimientos' },
] as const;

export function ReportesFilters({
  tipo,
  desde,
  hasta,
}: {
  tipo: string;
  desde: string;
  hasta: string;
}) {
  const router = useRouter();
  const [t, setT] = useState(tipo);
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);

  const generar = () => {
    const params = new URLSearchParams({ tipo: t, desde: d, hasta: h });
    router.push(`/home/reportes?${params.toString()}`);
  };

  return (
    <div className={'flex flex-wrap items-end gap-3'}>
      <div className={'flex flex-col gap-1'}>
        <Label>Reporte</Label>
        <Select value={t} onValueChange={setT}>
          <SelectTrigger className={'w-48'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_REPORTE.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={'flex flex-col gap-1'}>
        <Label>Desde</Label>
        <Input
          type={'date'}
          value={d}
          onChange={(e) => setD(e.target.value)}
          className={'w-40'}
        />
      </div>

      <div className={'flex flex-col gap-1'}>
        <Label>Hasta</Label>
        <Input
          type={'date'}
          value={h}
          onChange={(e) => setH(e.target.value)}
          className={'w-40'}
        />
      </div>

      <Button onClick={generar}>Generar</Button>
    </div>
  );
}
