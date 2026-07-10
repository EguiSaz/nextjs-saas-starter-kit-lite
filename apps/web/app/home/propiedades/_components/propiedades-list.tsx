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
  ESTADOS_PROPIEDAD,
  PropiedadFormValues,
  PropiedadSchema,
  TIPOS_PROPIEDAD,
} from '../_lib/schema/propiedad.schema';
import {
  deletePropiedadAction,
  savePropiedadAction,
} from '../_lib/server/server-actions';

type Propiedad = Tables<'propiedades'>;
type Arrendador = Pick<Tables<'arrendadores'>, 'id' | 'nombre'>;

const TIPO_LABEL: Record<string, string> = {
  departamento: 'Departamento',
  casa: 'Casa',
  local: 'Local',
  oficina: 'Oficina',
  bodega: 'Bodega',
  terreno: 'Terreno',
  otro: 'Otro',
};

const ESTADO_LABEL: Record<string, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  inactiva: 'Inactiva',
};

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  disponible: 'default',
  ocupada: 'secondary',
  inactiva: 'outline',
};

export function PropiedadesList({
  propiedades,
  arrendadores,
}: {
  propiedades: Propiedad[];
  arrendadores: Arrendador[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Propiedad | null>(null);

  const arrendadorNombre = (id: string) =>
    arrendadores.find((a) => a.id === id)?.nombre ?? '—';

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (propiedad: Propiedad) => {
    setEditing(propiedad);
    setDialogOpen(true);
  };

  const onDelete = (propiedad: Propiedad) => {
    if (!window.confirm(`¿Eliminar la propiedad "${propiedad.alias}"?`)) {
      return;
    }

    const promise = deletePropiedadAction({ id: propiedad.id }).then(() =>
      router.refresh(),
    );

    toast.promise(promise, {
      loading: 'Eliminando…',
      success: 'Propiedad eliminada',
      error: (err) =>
        err instanceof Error ? err.message : 'No se pudo eliminar',
    });
  };

  const noArrendadores = arrendadores.length === 0;

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-end'}>
        <Button onClick={openCreate} disabled={noArrendadores}>
          <Plus className={'mr-2 w-4'} />
          Nueva propiedad
        </Button>
      </div>

      {propiedades.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>Aún no hay propiedades</EmptyStateHeading>
          <EmptyStateText>
            {noArrendadores
              ? 'Primero registra un arrendador para poder añadir propiedades.'
              : 'Registra el primer inmueble para empezar.'}
          </EmptyStateText>
          {!noArrendadores ? (
            <EmptyStateButton onClick={openCreate}>
              <Plus className={'mr-2 w-4'} />
              Nueva propiedad
            </EmptyStateButton>
          ) : null}
        </EmptyState>
      ) : (
        <div className={'rounded-md border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias</TableHead>
                <TableHead>Arrendador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className={'w-24 text-right'}>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {propiedades.map((propiedad) => (
                <TableRow key={propiedad.id}>
                  <TableCell className={'font-medium'}>
                    {propiedad.alias}
                    <div className={'text-muted-foreground text-xs'}>
                      {propiedad.direccion}
                    </div>
                  </TableCell>
                  <TableCell>{arrendadorNombre(propiedad.arrendador_id)}</TableCell>
                  <TableCell>{TIPO_LABEL[propiedad.tipo] ?? propiedad.tipo}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[propiedad.estado] ?? 'outline'}>
                      {ESTADO_LABEL[propiedad.estado] ?? propiedad.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className={'text-right'}>
                    <div className={'flex justify-end gap-1'}>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => openEdit(propiedad)}
                      >
                        <Pencil className={'w-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(propiedad)}
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
              {editing ? 'Editar propiedad' : 'Nueva propiedad'}
            </DialogTitle>
          </DialogHeader>

          <PropiedadForm
            key={editing?.id ?? 'new'}
            propiedad={editing}
            arrendadores={arrendadores}
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

function PropiedadForm({
  propiedad,
  arrendadores,
  onSaved,
}: {
  propiedad: Propiedad | null;
  arrendadores: Arrendador[];
  onSaved: () => void;
}) {
  const form = useForm<PropiedadFormValues>({
    resolver: zodResolver(PropiedadSchema),
    defaultValues: {
      id: propiedad?.id,
      arrendador_id: propiedad?.arrendador_id ?? arrendadores[0]?.id ?? '',
      alias: propiedad?.alias ?? '',
      direccion: propiedad?.direccion ?? '',
      tipo: propiedad?.tipo ?? 'departamento',
      habitaciones: propiedad?.habitaciones ?? null,
      banos: propiedad?.banos ?? null,
      metros_cuadrados: propiedad?.metros_cuadrados ?? null,
      estado: propiedad?.estado ?? 'disponible',
      notas: propiedad?.notas ?? '',
    },
  });

  const onSubmit = (values: PropiedadFormValues) => {
    const promise = savePropiedadAction(values).then(onSaved);

    toast.promise(promise, {
      loading: 'Guardando…',
      success: propiedad ? 'Propiedad actualizada' : 'Propiedad creada',
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
          name={'alias'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alias *</FormLabel>
              <FormControl>
                <Input placeholder={'Ej. Depto 101 Reforma'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={'direccion'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={'arrendador_id'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arrendador *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={'Selecciona un arrendador'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {arrendadores.map((arrendador) => (
                    <SelectItem key={arrendador.id} value={arrendador.id}>
                      {arrendador.nombre}
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
            name={'tipo'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
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
                    {TIPOS_PROPIEDAD.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPO_LABEL[tipo]}
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
                    {ESTADOS_PROPIEDAD.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {ESTADO_LABEL[estado]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={'grid grid-cols-3 gap-4'}>
          <FormField
            name={'habitaciones'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Habitaciones</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'banos'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baños</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={'metros_cuadrados'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>m²</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    min={0}
                    step={'0.01'}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
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
