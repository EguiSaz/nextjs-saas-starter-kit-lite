'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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

import { formatMoney } from '~/lib/format';

import {
  CerrarContratoValues,
  CerrarContratoSchema,
} from '../_lib/schema/contrato.schema';
import { cerrarContratoAction } from '../_lib/server/server-actions';

export function CerrarContratoDialog({
  contratoId,
  deposito,
}: {
  contratoId: string;
  deposito: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<CerrarContratoValues>({
    resolver: zodResolver(CerrarContratoSchema),
    defaultValues: {
      id: contratoId,
      destino_deposito: 'integro',
      monto_retenido: 0,
      fecha_cierre: '',
    },
  });

  const destino = form.watch('destino_deposito');

  const onSubmit = (values: CerrarContratoValues) => {
    const promise = cerrarContratoAction(values).then(() => {
      setOpen(false);
      router.refresh();
    });

    toast.promise(promise, {
      loading: 'Cerrando contrato…',
      success: 'Contrato finalizado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo cerrar el contrato',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'}>Cerrar contrato</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar contrato</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className={'flex flex-col space-y-4'}
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              name={'destino_deposito'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino del depósito ({formatMoney(deposito)})</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={'integro'}>
                        Devolver íntegro
                      </SelectItem>
                      <SelectItem value={'retenido'}>Retener todo</SelectItem>
                      <SelectItem value={'parcial'}>
                        Retención parcial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {destino === 'parcial' ? (
              <FormField
                name={'monto_retenido'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto retenido</FormLabel>
                    <FormControl>
                      <Input
                        type={'number'}
                        step={'0.01'}
                        min={0}
                        max={deposito}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Se devolverá el resto del depósito.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              name={'fecha_cierre'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de cierre</FormLabel>
                  <FormControl>
                    <Input type={'date'} {...field} />
                  </FormControl>
                  <FormDescription>
                    Si se deja vacío, se usa la fecha de hoy.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type={'submit'} disabled={form.formState.isSubmitting}>
                Finalizar contrato
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
