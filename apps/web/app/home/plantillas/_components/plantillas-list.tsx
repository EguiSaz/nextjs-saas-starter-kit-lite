'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@kit/ui/textarea';

import { Tables } from '~/lib/database.types';

import {
  PlantillaFormValues,
  PlantillaSchema,
  TIPOS_PLANTILLA,
} from '../_lib/schema/plantilla.schema';
import {
  deletePlantillaAction,
  savePlantillaAction,
} from '../_lib/server/server-actions';

type Plantilla = Tables<'plantillas'>;

const TIPO_LABEL: Record<string, string> = {
  contrato: 'Contrato',
  recordatorio: 'Recordatorio',
  recibo: 'Recibo',
  otro: 'Otro',
};

export function PlantillasList({ plantillas }: { plantillas: Plantilla[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plantilla | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (plantilla: Plantilla) => {
    setEditing(plantilla);
    setDialogOpen(true);
  };

  const onDelete = (plantilla: Plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) {
      return;
    }

    const promise = deletePlantillaAction({ id: plantilla.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Eliminando…',
      success: 'Plantilla eliminada',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo eliminar',
    });
  };

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={openCreate}>
          <Plus className={'mr-2 w-4'} />
          Nueva plantilla
        </Button>
      </div>

      {plantillas.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay plantillas</EmptyStateHeading>
          <EmptyStateText>
            Crea una plantilla de contrato, recordatorio o recibo.
          </EmptyStateText>
          <EmptyStateButton onClick={openCreate}>
            <Plus className={'mr-2 w-4'} />
            Nueva plantilla
          </EmptyStateButton>
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className={'w-24 text-right'}>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {plantillas.map((plantilla) => (
                <TableRow key={plantilla.id}>
                  <TableCell className={'font-medium'}>
                    {plantilla.nombre}
                  </TableCell>
                  <TableCell>
                    <Badge variant={'secondary'}>
                      {TIPO_LABEL[plantilla.tipo] ?? plantilla.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className={'text-right'}>
                    <div className={'flex justify-end gap-1'}>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => openEdit(plantilla)}
                      >
                        <Pencil className={'w-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(plantilla)}
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
        <DialogContent className={'sm:max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar plantilla' : 'Nueva plantilla'}
            </DialogTitle>
          </DialogHeader>

          <PlantillaForm
            key={editing?.id ?? 'new'}
            plantilla={editing}
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

function PlantillaForm({
  plantilla,
  onSaved,
}: {
  plantilla: Plantilla | null;
  onSaved: () => void;
}) {
  const form = useForm<PlantillaFormValues>({
    resolver: zodResolver(PlantillaSchema),
    defaultValues: {
      id: plantilla?.id,
      nombre: plantilla?.nombre ?? '',
      tipo: plantilla?.tipo ?? 'contrato',
      contenido: plantilla?.contenido ?? '',
    },
  });

  const onSubmit = (values: PlantillaFormValues) => {
    const promise = savePlantillaAction(values).then(onSaved);

    toast.promise(promise, {
      loading: 'Guardando…',
      success: plantilla ? 'Plantilla actualizada' : 'Plantilla creada',
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
        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'nombre'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input placeholder={'Ej. Contrato estándar'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'tipo'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_PLANTILLA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name={'contenido'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenido</FormLabel>
              <FormControl>
                <Textarea
                  rows={12}
                  placeholder={'Texto o HTML de la plantilla…'}
                  className={'font-mono text-sm'}
                  {...field}
                />
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
