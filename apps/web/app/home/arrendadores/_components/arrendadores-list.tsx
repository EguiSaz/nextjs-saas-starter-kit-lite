'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Textarea } from '@kit/ui/textarea';

import { Tables } from '~/lib/database.types';

import {
  ArrendadorFormValues,
  ArrendadorSchema,
} from '../_lib/schema/arrendador.schema';
import {
  deleteArrendadorAction,
  saveArrendadorAction,
} from '../_lib/server/server-actions';

type Arrendador = Tables<'arrendadores'>;

export function ArrendadoresList({
  arrendadores,
}: {
  arrendadores: Arrendador[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Arrendador | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (arrendador: Arrendador) => {
    setEditing(arrendador);
    setDialogOpen(true);
  };

  const onDelete = (arrendador: Arrendador) => {
    if (
      !window.confirm(`¿Eliminar al arrendador "${arrendador.nombre}"?`)
    ) {
      return;
    }

    const promise = deleteArrendadorAction({ id: arrendador.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Eliminando…',
      success: 'Arrendador eliminado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo eliminar',
    });
  };

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={openCreate}>
          <Plus className={'mr-2 w-4'} />
          Nuevo arrendador
        </Button>
      </div>

      {arrendadores.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay arrendadores</EmptyStateHeading>
          <EmptyStateText>
            Registra al primer dueño de inmuebles para empezar.
          </EmptyStateText>
          <EmptyStateButton onClick={openCreate}>
            <Plus className={'mr-2 w-4'} />
            Nuevo arrendador
          </EmptyStateButton>
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead className={'w-24 text-right'}>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {arrendadores.map((arrendador) => (
                <TableRow key={arrendador.id}>
                  <TableCell className={'font-medium'}>
                    {arrendador.nombre}
                    {arrendador.es_propio ? (
                      <span
                        className={
                          'text-muted-foreground ml-2 text-xs font-normal'
                        }
                      >
                        (propio)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className={'text-muted-foreground text-sm'}>
                    {arrendador.email ?? arrendador.telefono ?? '—'}
                  </TableCell>
                  <TableCell>{arrendador.comision_pct}%</TableCell>
                  <TableCell className={'text-right'}>
                    <div className={'flex justify-end gap-1'}>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => openEdit(arrendador)}
                      >
                        <Pencil className={'w-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(arrendador)}
                        disabled={arrendador.es_propio}
                        title={
                          arrendador.es_propio
                            ? 'El arrendador propio no se puede eliminar'
                            : 'Eliminar'
                        }
                      >
                        <Trash2 className={'w-4'} />
                      </Button>
                    </div>
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
            <DialogTitle>
              {editing ? 'Editar arrendador' : 'Nuevo arrendador'}
            </DialogTitle>
          </DialogHeader>

          <ArrendadorForm
            key={editing?.id ?? 'new'}
            arrendador={editing}
            onSaved={() => {
              setDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrendadorForm({
  arrendador,
  onSaved,
}: {
  arrendador: Arrendador | null;
  onSaved: () => void;
}) {
  const form = useForm<ArrendadorFormValues>({
    resolver: zodResolver(ArrendadorSchema),
    defaultValues: {
      id: arrendador?.id,
      nombre: arrendador?.nombre ?? '',
      email: arrendador?.email ?? '',
      telefono: arrendador?.telefono ?? '',
      identificacion: arrendador?.identificacion ?? '',
      cuenta_bancaria: arrendador?.cuenta_bancaria ?? '',
      comision_pct: arrendador?.comision_pct ?? 0,
      notas: arrendador?.notas ?? '',
    },
  });

  const onSubmit = (values: ArrendadorFormValues) => {
    const promise = saveArrendadorAction(values).then(onSaved);

    toast.promise(promise, {
      loading: 'Guardando…',
      success: arrendador ? 'Arrendador actualizado' : 'Arrendador creado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo guardar',
    });
  };

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          name={'nombre'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder={'Nombre del dueño'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'email'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type={'email'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'telefono'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'identificacion'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificación (RFC/CURP)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'comision_pct'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comisión (%)</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    step={'0.01'}
                    min={0}
                    max={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name={'cuenta_bancaria'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta bancaria (CLABE)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={'notas'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type={'submit'} disabled={form.formState.isSubmitting}>
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
