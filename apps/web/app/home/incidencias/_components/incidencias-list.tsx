'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
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

import { formatMoney } from '~/lib/format';
import { Tables } from '~/lib/database.types';

import {
  ESTADOS_INCIDENCIA,
  IncidenciaFormValues,
  IncidenciaSchema,
  PRIORIDADES,
  RESPONSABLES,
} from '../_lib/schema/incidencia.schema';
import {
  deleteIncidenciaAction,
  facturarIncidenciaAction,
  saveIncidenciaAction,
} from '../_lib/server/server-actions';

type Incidencia = Tables<'incidencias'> & { propiedad_alias: string };
type Opcion = { id: string; label: string };

const PRIORIDAD_LABEL: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};
const ESTADO_LABEL: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  resuelta: 'Resuelta',
};
const RESPONSABLE_LABEL: Record<string, string> = {
  arrendador: 'Arrendador',
  inquilino: 'Inquilino',
};
const PRIORIDAD_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> =
  {
    baja: 'secondary',
    media: 'default',
    alta: 'destructive',
  };

export function IncidenciasList({
  incidencias,
  propiedades,
  contratos,
}: {
  incidencias: Incidencia[];
  propiedades: Opcion[];
  contratos: Opcion[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Incidencia | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (incidencia: Incidencia) => {
    setEditing(incidencia);
    setDialogOpen(true);
  };

  const onDelete = (incidencia: Incidencia) => {
    if (!window.confirm(`¿Eliminar la incidencia "${incidencia.titulo}"?`)) {
      return;
    }

    const promise = deleteIncidenciaAction({ id: incidencia.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Eliminando…',
      success: 'Incidencia eliminada',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo eliminar',
    });
  };

  const onFacturar = (incidencia: Incidencia) => {
    if (
      !window.confirm(
        `¿Facturar ${formatMoney(incidencia.costo)} al inquilino como cargo del contrato?`,
      )
    ) {
      return;
    }

    const promise = facturarIncidenciaAction({ id: incidencia.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Facturando…',
      success: 'Incidencia facturada al contrato',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo facturar',
    });
  };

  const puedeFacturar = (i: Incidencia) =>
    i.transaccion_id == null &&
    i.responsable === 'inquilino' &&
    Number(i.costo) > 0 &&
    i.contrato_id != null;

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={openCreate} disabled={propiedades.length === 0}>
          <Plus className={'mr-2 w-4'} />
          Nueva incidencia
        </Button>
      </div>

      {incidencias.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay incidencias</EmptyStateHeading>
          <EmptyStateText>
            {propiedades.length === 0
              ? 'Primero registra una propiedad.'
              : 'Registra un problema o gasto de mantenimiento.'}
          </EmptyStateText>
          {propiedades.length > 0 ? (
            <EmptyStateButton onClick={openCreate}>
              <Plus className={'mr-2 w-4'} />
              Nueva incidencia
            </EmptyStateButton>
          ) : null}
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className={'text-right'}>Costo</TableHead>
                <TableHead className={'w-32 text-right'}>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {incidencias.map((incidencia) => (
                <TableRow key={incidencia.id}>
                  <TableCell className={'font-medium'}>
                    {incidencia.titulo}
                    {incidencia.transaccion_id ? (
                      <Badge variant={'outline'} className={'ml-2'}>
                        Facturada
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{incidencia.propiedad_alias}</TableCell>
                  <TableCell>
                    <Badge
                      variant={PRIORIDAD_VARIANT[incidencia.prioridad] ?? 'default'}
                    >
                      {PRIORIDAD_LABEL[incidencia.prioridad]}
                    </Badge>
                  </TableCell>
                  <TableCell>{ESTADO_LABEL[incidencia.estado]}</TableCell>
                  <TableCell>
                    {RESPONSABLE_LABEL[incidencia.responsable]}
                  </TableCell>
                  <TableCell className={'text-right'}>
                    {formatMoney(incidencia.costo)}
                  </TableCell>
                  <TableCell className={'text-right'}>
                    <div className={'flex justify-end gap-1'}>
                      {puedeFacturar(incidencia) ? (
                        <Button
                          variant={'ghost'}
                          size={'icon'}
                          onClick={() => onFacturar(incidencia)}
                          title={'Facturar al inquilino'}
                        >
                          <Receipt className={'w-4'} />
                        </Button>
                      ) : null}
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => openEdit(incidencia)}
                      >
                        <Pencil className={'w-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(incidencia)}
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
              {editing ? 'Editar incidencia' : 'Nueva incidencia'}
            </DialogTitle>
          </DialogHeader>

          <IncidenciaForm
            key={editing?.id ?? 'new'}
            incidencia={editing}
            propiedades={propiedades}
            contratos={contratos}
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

function IncidenciaForm({
  incidencia,
  propiedades,
  contratos,
  onSaved,
}: {
  incidencia: Incidencia | null;
  propiedades: Opcion[];
  contratos: Opcion[];
  onSaved: () => void;
}) {
  const facturada = incidencia?.transaccion_id != null;

  const form = useForm<IncidenciaFormValues>({
    resolver: zodResolver(IncidenciaSchema),
    defaultValues: {
      id: incidencia?.id,
      propiedad_id: incidencia?.propiedad_id ?? propiedades[0]?.id ?? '',
      contrato_id: incidencia?.contrato_id ?? '',
      titulo: incidencia?.titulo ?? '',
      descripcion: incidencia?.descripcion ?? '',
      costo: incidencia?.costo ?? 0,
      prioridad: incidencia?.prioridad ?? 'media',
      estado: incidencia?.estado ?? 'abierta',
      responsable: incidencia?.responsable ?? 'arrendador',
    },
  });

  const onSubmit = (values: IncidenciaFormValues) => {
    const promise = saveIncidenciaAction(values).then(onSaved);

    toast.promise(promise, {
      loading: 'Guardando…',
      success: incidencia ? 'Incidencia actualizada' : 'Incidencia creada',
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
          name={'titulo'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder={'Ej. Fuga en el baño'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'propiedad_id'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Propiedad *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={'Selecciona'} />
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
            name={'contrato_id'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato</FormLabel>
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === '__none__' ? '' : v)
                  }
                  defaultValue={field.value ? field.value : '__none__'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={'Sin contrato'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={'__none__'}>Sin contrato</SelectItem>
                    {contratos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
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
          name={'descripcion'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'costo'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    step={'0.01'}
                    min={0}
                    disabled={facturada}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'responsable'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable del pago</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={facturada}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESPONSABLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {RESPONSABLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={'grid grid-cols-2 gap-4'}>
          <FormField
            name={'prioridad'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDAD_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'estado'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ESTADOS_INCIDENCIA.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_LABEL[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {facturada ? (
          <p className={'text-muted-foreground text-xs'}>
            Esta incidencia ya fue facturada: el costo y el responsable no se
            pueden modificar.
          </p>
        ) : null}

        <DialogFooter>
          <Button type={'submit'} disabled={form.formState.isSubmitting}>
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
