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
  InquilinoFormValues,
  InquilinoSchema,
} from '../_lib/schema/inquilino.schema';
import {
  deleteInquilinoAction,
  saveInquilinoAction,
} from '../_lib/server/server-actions';

type Inquilino = Tables<'inquilinos'>;

export function InquilinosList({ inquilinos }: { inquilinos: Inquilino[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Inquilino | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (inquilino: Inquilino) => {
    setEditing(inquilino);
    setDialogOpen(true);
  };

  const onDelete = (inquilino: Inquilino) => {
    if (!window.confirm(`¿Eliminar al inquilino "${inquilino.nombre}"?`)) {
      return;
    }

    const promise = deleteInquilinoAction({ id: inquilino.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Eliminando…',
      success: 'Inquilino eliminado',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo eliminar',
    });
  };

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={openCreate}>
          <Plus className={'mr-2 w-4'} />
          Nuevo inquilino
        </Button>
      </div>

      {inquilinos.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay inquilinos</EmptyStateHeading>
          <EmptyStateText>
            Registra al primer arrendatario para empezar.
          </EmptyStateText>
          <EmptyStateButton onClick={openCreate}>
            <Plus className={'mr-2 w-4'} />
            Nuevo inquilino
          </EmptyStateButton>
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead className={'w-24 text-right'}>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {inquilinos.map((inquilino) => (
                <TableRow key={inquilino.id}>
                  <TableCell className={'font-medium'}>
                    {inquilino.nombre}
                  </TableCell>
                  <TableCell className={'text-muted-foreground text-sm'}>
                    {inquilino.email ?? inquilino.telefono ?? '—'}
                  </TableCell>
                  <TableCell className={'text-muted-foreground text-sm'}>
                    {inquilino.identificacion ?? '—'}
                  </TableCell>
                  <TableCell className={'text-right'}>
                    <div className={'flex justify-end gap-1'}>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => openEdit(inquilino)}
                      >
                        <Pencil className={'w-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(inquilino)}
                        title={'Eliminar'}
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
              {editing ? 'Editar inquilino' : 'Nuevo inquilino'}
            </DialogTitle>
          </DialogHeader>

          <InquilinoForm
            key={editing?.id ?? 'new'}
            inquilino={editing}
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

function InquilinoForm({
  inquilino,
  onSaved,
}: {
  inquilino: Inquilino | null;
  onSaved: () => void;
}) {
  const form = useForm<InquilinoFormValues>({
    resolver: zodResolver(InquilinoSchema),
    defaultValues: {
      id: inquilino?.id,
      nombre: inquilino?.nombre ?? '',
      email: inquilino?.email ?? '',
      telefono: inquilino?.telefono ?? '',
      identificacion: inquilino?.identificacion ?? '',
      contacto_emergencia: inquilino?.contacto_emergencia ?? '',
      notas: inquilino?.notas ?? '',
    },
  });

  const onSubmit = (values: InquilinoFormValues) => {
    const promise = saveInquilinoAction(values).then(onSaved);

    toast.promise(promise, {
      loading: 'Guardando…',
      success: inquilino ? 'Inquilino actualizado' : 'Inquilino creado',
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
                <Input placeholder={'Nombre del inquilino'} {...field} />
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
            name={'contacto_emergencia'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contacto de emergencia</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
