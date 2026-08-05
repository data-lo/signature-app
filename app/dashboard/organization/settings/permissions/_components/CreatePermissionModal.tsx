'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { useCreateOrganizationPermission } from '../_hooks/useCreateOrganizationPermission';
import {
  createPermissionSchema,
  type CreatePermissionFormValues,
} from '../_schemas';

interface CreatePermissionModalProps {
  organizationId: string;
}

export default function CreatePermissionModal({
  organizationId,
}: CreatePermissionModalProps) {
  const [open, setOpen] = useState(false);
  const createPermissionMutation = useCreateOrganizationPermission(organizationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreatePermissionFormValues>({
    resolver: zodResolver(createPermissionSchema),
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function onSubmit(values: CreatePermissionFormValues) {
    createPermissionMutation.mutate(values.name, {
      onSuccess: () => handleOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Crear permiso
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear permiso</DialogTitle>
          <DialogDescription>
            Agrega un nuevo permiso al catálogo de la organización.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <TextField
              id="permission-name"
              label="Nombre"
              placeholder="Aprobar documentos"
              error={errors.name}
              {...register('name')}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createPermissionMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createPermissionMutation.isPending}
            >
              {createPermissionMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
