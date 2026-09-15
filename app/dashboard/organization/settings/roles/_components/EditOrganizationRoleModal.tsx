'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { Form } from '@/components/form/form';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import {
  saveOrganizationRoleSchema,
  isStaticPermissionKey,
  type SaveOrganizationRoleFormValues,
} from '../_schemas';
import PermissionCheckboxList from './PermissionCheckboxList';

interface EditOrganizationRoleModalProps {
  role: OrganizationRole | null;
  /** Catálogo estático completo, para ofrecer los siete aunque este rol no tenga todos. */
  availablePermissions: OrganizationRole['permissions'];
  onOpenChange: (open: boolean) => void;
  onConfirm: (roleId: string, values: SaveOrganizationRoleFormValues) => void;
  confirming?: boolean;
}

/** Edita nombre y permisos de un rol personalizado. Nunca se abre para ADMIN/MEMBER. */
export default function EditOrganizationRoleModal({
  role,
  availablePermissions,
  onOpenChange,
  onConfirm,
  confirming,
}: EditOrganizationRoleModalProps) {
  const open = role !== null;

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

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        permissionKeys: role.permissions
          .map((permission) => permission.key)
          .filter(isStaticPermissionKey),
      });
    }
  }, [role, reset]);

  function onSubmit(values: SaveOrganizationRoleFormValues) {
    if (!role) return;
    onConfirm(role.id, values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Cambia el nombre o los permisos de {role?.name}.
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <TextField
              id="edit-role-name"
              label="Nombre"
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
              onClick={() => onOpenChange(false)}
              disabled={confirming}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || confirming}>
              {confirming ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
