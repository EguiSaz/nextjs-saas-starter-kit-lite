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

import { formatMoney } from '~/lib/format';

import {
  RegistrarPagoValues,
  RegistrarPagoSchema,
} from '../_lib/schema/pago.schema';
import { registrarPagoAction } from '../_lib/server/pagos-actions';

export function RegistrarPagoDialog({
  contratoId,
  saldo,
}: {
  contratoId: string;
  saldo: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<RegistrarPagoValues>({
    resolver: zodResolver(RegistrarPagoSchema),
    defaultValues: {
      contrato_id: contratoId,
      monto: saldo > 0 ? saldo : 0,
      mora: 0,
      metodo_pago: '',
      fecha: '',
    },
  });

  const onSubmit = (values: RegistrarPagoValues) => {
    const promise = registrarPagoAction(values).then(() => {
      setOpen(false);
      router.refresh();
    });

    toast.promise(promise, {
      loading: 'Registrando pago…',
      success: 'Pago registrado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo registrar el pago',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Registrar pago</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className={'flex flex-col space-y-4'}
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              name={'monto'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del pago *</FormLabel>
                  <FormControl>
                    <Input type={'number'} step={'0.01'} min={0} {...field} />
                  </FormControl>
                  <FormDescription>
                    Saldo actual: {formatMoney(saldo)}. Puedes registrar un pago
                    parcial (menor al saldo).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={'mora'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recargo por mora (opcional)</FormLabel>
                  <FormControl>
                    <Input type={'number'} step={'0.01'} min={0} {...field} />
                  </FormControl>
                  <FormDescription>
                    Si se indica, se agrega un cargo por mora antes del pago.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={'grid grid-cols-2 gap-4'}>
              <FormField
                name={'metodo_pago'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={'Transferencia, efectivo…'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name={'fecha'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type={'date'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type={'submit'} disabled={form.formState.isSubmitting}>
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
