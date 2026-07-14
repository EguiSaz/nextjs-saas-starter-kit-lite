'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { formatMoney } from '~/lib/format';

import {
  CrearContratoValues,
  CrearContratoSchema,
} from '../_lib/schema/contrato.schema';
import { crearContratoAction } from '../_lib/server/server-actions';

export type ContratoRow = {
  id: string;
  estado: string;
  renta_mensual: number;
  saldo: number;
  propiedad_alias: string;
  inquilino_nombre: string;
};

type Opcion = { id: string; label: string };

export function ContratosList({
  contratos,
  propiedadesDisponibles,
  inquilinos,
}: {
  contratos: ContratoRow[];
  propiedadesDisponibles: Opcion[];
  inquilinos: Opcion[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const puedeCrear =
    propiedadesDisponibles.length > 0 && inquilinos.length > 0;

  const faltantes = !puedeCrear
    ? propiedadesDisponibles.length === 0
      ? 'Necesitas al menos una propiedad disponible.'
      : 'Necesitas al menos un inquilino registrado.'
    : null;

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={() => setDialogOpen(true)} disabled={!puedeCrear}>
          <Plus className={'mr-2 w-4'} />
          Nuevo contrato
        </Button>
      </div>

      {contratos.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay contratos</EmptyStateHeading>
          <EmptyStateText>
            {faltantes ?? 'Crea el primer contrato de arrendamiento.'}
          </EmptyStateText>
          {puedeCrear ? (
            <EmptyStateButton onClick={() => setDialogOpen(true)}>
              <Plus className={'mr-2 w-4'} />
              Nuevo contrato
            </EmptyStateButton>
          ) : null}
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propiedad</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Renta</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {contratos.map((contrato) => (
                <TableRow
                  key={contrato.id}
                  className={'hover:bg-muted/50 cursor-pointer'}
                >
                  <TableCell className={'font-medium'}>
                    <Link
                      href={`/home/contratos/${contrato.id}`}
                      className={'hover:underline'}
                    >
                      {contrato.propiedad_alias}
                    </Link>
                  </TableCell>
                  <TableCell>{contrato.inquilino_nombre}</TableCell>
                  <TableCell>{formatMoney(contrato.renta_mensual)}</TableCell>
                  <TableCell>{formatMoney(contrato.saldo)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contrato.estado === 'activo' ? 'default' : 'secondary'
                      }
                    >
                      {contrato.estado === 'activo' ? 'Activo' : 'Finalizado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contrato</DialogTitle>
          </DialogHeader>

          <CrearContratoForm
            propiedades={propiedadesDisponibles}
            inquilinos={inquilinos}
            onSaved={(id) => {
              setDialogOpen(false);
              router.push(`/home/contratos/${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CrearContratoForm({
  propiedades,
  inquilinos,
  onSaved,
}: {
  propiedades: Opcion[];
  inquilinos: Opcion[];
  onSaved: (id: string) => void;
}) {
  const form = useForm<CrearContratoValues>({
    resolver: zodResolver(CrearContratoSchema),
    defaultValues: {
      propiedad_id: propiedades[0]?.id ?? '',
      inquilino_id: inquilinos[0]?.id ?? '',
      fecha_inicio: '',
      fecha_fin: '',
      renta_mensual: 0,
      deposito: 0,
      dia_pago: 1,
    },
  });

  const onSubmit = (values: CrearContratoValues) => {
    const promise = crearContratoAction(values).then((res) => {
      if (res?.id) onSaved(res.id);
    });

    toast.promise(promise, {
      loading: 'Creando contrato…',
      success: 'Contrato creado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo crear el contrato',
    });
  };

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          name={'propiedad_id'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Propiedad *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={'Selecciona una propiedad'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {propiedades.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={'inquilino_id'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inquilino *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={'Selecciona un inquilino'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {inquilinos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'fecha_inicio'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio *</FormLabel>
                <FormControl>
                  <Input type={'date'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'fecha_fin'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de fin *</FormLabel>
                <FormControl>
                  <Input type={'date'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={'grid grid-cols-3 gap-4'}>
          <FormField
            name={'renta_mensual'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Renta mensual *</FormLabel>
                <FormControl>
                  <Input type={'number'} step={'0.01'} min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'deposito'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Depósito</FormLabel>
                <FormControl>
                  <Input type={'number'} step={'0.01'} min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'dia_pago'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Día de pago *</FormLabel>
                <FormControl>
                  <Input type={'number'} min={1} max={31} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type={'submit'} disabled={form.formState.isSubmitting}>
            Crear contrato
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
