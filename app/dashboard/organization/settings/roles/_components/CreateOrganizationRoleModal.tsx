'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { Form } from '@/components/form/form';
import type { RolePermission } from '@/lib/api/organization-roles';
import { useCreateOrganizationRole } from '../_hooks/useCreateOrganizationRole';
import {
  saveOrganizationRoleSchema,
  type SaveOrganizationRoleFormValues,
} from '../_schemas';
import PermissionCheckboxList from './PermissionCheckboxList';

interface CreateOrganizationRoleModalProps {
  organizationId: string;
  /** Catálogo estático completo, tomado de un rol que ya lo trae entero (ver ADMIN). */
  availablePermissions: RolePermission[];
}

export default function CreateOrganizationRoleModal({
  organizationId,
  availablePermissions,
}: CreateOrganizationRoleModalProps) {
  const [open, setOpen] = useState(false);
  const createRoleMutation = useCreateOrganizationRole(organizationId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<SaveOrganizationRoleFormValues>({
    resolver: zodResolver(saveOrganizationRoleSchema),
    mode: 'onChange',
    defaultValues: { name: '', permissionKeys: [] },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function onSubmit(values: SaveOrganizationRoleFormValues) {
    createRoleMutation.mutate(values, {
      onSuccess: () => handleOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Crear rol
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear rol personalizado</DialogTitle>
          <DialogDescription>
            Nombra el rol y elige los permisos que otorga dentro de tu
            organización.
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <TextField
              id="role-name"
              label="Nombre"
              placeholder="Aprobador"
              error={errors.name}
              {...register('name')}
            />

            <Field>
              <FieldLabel>Permisos</FieldLabel>
              <Controller
                control={control}
                name="permissionKeys"
                render={({ field }) => (
                  <PermissionCheckboxList
                    availablePermissions={availablePermissions}
                    selectedKeys={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createRoleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || createRoleMutation.isPending}>
              {createRoleMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
