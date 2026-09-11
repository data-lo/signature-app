'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRoundPlus } from 'lucide-react';
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
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { Form } from '@/components/form/form';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useAddMember } from '../_hooks/useAddMember';
import { addMemberSchema, type AddMemberFormValues } from '../_schemas';
import RolePermissionsPreview from './RolePermissionsPreview';

interface AddMemberModalProps {
  organizationId: string | null;
}

/**
 * Alta directa de un miembro que ya tiene cuenta en la plataforma.
 *
 * Convive con "Invitar miembro" y no lo reemplaza: la invitación es para quien todavía no está
 * registrado y depende de que acepte un correo; esto es para quien ya está dentro, donde esa
 * espera no aporta nada. Si el correo no corresponde a ningún usuario, el backend responde
 * diciéndolo y el mensaje sugiere usar la invitación.
 *
 * Al elegir el rol se listan debajo los permisos que ese rol otorga, para que la asignación se
 * confirme viendo lo que habilita y no sólo el nombre del rol.
 */
export default function AddMemberModal({
  organizationId,
}: AddMemberModalProps) {
  const [open, setOpen] = useState(false);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const systemRolesQuery = useSystemRoles(open);
  const addMemberMutation = useAddMember(organizationId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    mode: 'onChange',
    defaultValues: { email: '', roleId: '', position: '' },
  });

  // `useWatch` en vez de `watch()`: sólo este bloque se vuelve a renderizar al cambiar el rol.
  const selectedRoleId = useWatch({ control, name: 'roleId' });
  const selectedRole = systemRolesQuery.data?.find(
    (role) => role.id === selectedRoleId,
  );

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function onSubmit(values: AddMemberFormValues) {
    addMemberMutation.mutate(
      {
        email: values.email,
        roleId: values.roleId,
        position: values.position?.trim() ? values.position.trim() : undefined,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserRoundPlus className="size-4" />
        Agregar miembro
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar miembro</DialogTitle>
          <DialogDescription>
            Agrega a alguien que ya tiene cuenta y asígnale un rol. Sus permisos
            son los del rol que elijas. Si todavía no está registrado, usa
            &quot;Invitar miembro&quot;.
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <FormInput
              control={control}
              name="email"
              id="add-member-email"
              label="Correo electrónico"
              type="email"
              placeholder="miembro@empresa.com"
              required
            />

            <FormSelect
              control={control}
              name="roleId"
              id="add-member-role"
              label="Rol"
              required
              placeholder={
                systemRolesQuery.isLoading
                  ? 'Cargando roles...'
                  : 'Selecciona un rol'
              }
              options={(systemRolesQuery.data ?? []).map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />

            <FormInput
              control={control}
              name="position"
              id="add-member-position"
              label="Puesto (opcional)"
              placeholder="Gerente de TI"
            />
          </FieldGroup>

          <RolePermissionsPreview
            roleName={selectedRole?.name}
            permissions={selectedRole?.permissions ?? []}
            loading={systemRolesQuery.isLoading}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addMemberMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Agregando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
