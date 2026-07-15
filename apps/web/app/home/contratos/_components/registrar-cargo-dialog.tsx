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
  RegistrarCargoValues,
  RegistrarCargoSchema,
} from '../_lib/schema/pago.schema';
import { registrarCargoAction } from '../_lib/server/pagos-actions';

const CATEGORIA_LABEL: Record<string, string> = {
  ajuste: 'Ajuste',
  gasto: 'Gasto',
  mora: 'Mora',
};

export function RegistrarCargoDialog({
  contratoId,
}: {
  contratoId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<RegistrarCargoValues>({
    resolver: zodResolver(RegistrarCargoSchema),
    defaultValues: {
      contrato_id: contratoId,
      categoria: 'ajuste',
      concepto: '',
      monto: 0,
      fecha: '',
    },
  });

  const onSubmit = (values: RegistrarCargoValues) => {
    const promise = registrarCargoAction(values).then(() => {
      setOpen(false);
      router.refresh();
    });

    toast.promise(promise, {
      loading: 'Registrando cargo…',
      success: 'Cargo registrado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo registrar el cargo',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'}>Registrar cargo</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cargo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className={'flex flex-col space-y-4'}
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              name={'categoria'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
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
                      {(['ajuste', 'gasto', 'mora'] as const).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORIA_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={'concepto'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto *</FormLabel>
                  <FormControl>
                    <Input placeholder={'Descripción del cargo'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={'grid grid-cols-2 gap-4'}>
              <FormField
                name={'monto'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <Input type={'number'} step={'0.01'} min={0} {...field} />
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
                Registrar cargo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
