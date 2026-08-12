'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
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
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useInviteMember } from '../_hooks/useInviteMember';
import {
  inviteMemberSchema,
  type InviteMemberFormValues,
} from '../_invite-member-schema';
import { Form } from '@/components/form/form';

export default function InviteMemberModal() {
  const [open, setOpen] = useState(false);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  // Consulta y mutación como instancias con nombre: `systemRolesQuery.isLoading` no se confunde
  // con `inviteMemberMutation.isPending` ni obliga a renombrar `data` con alias.
  const systemRolesQuery = useSystemRoles(open);
  const inviteMemberMutation = useInviteMember();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    mode: 'onChange',
    defaultValues: { email: '', roleId: '' },
  });

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function onSubmit(values: InviteMemberFormValues) {
    inviteMemberMutation.mutate(values, {
      onSuccess: () => handleOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus className="size-4" />
        Invitar miembro
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Ingresa el correo del nuevo miembro y selecciona su rol dentro de
            la organización.
          </DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <FormInput
              control={control}
              name="email"
              id="invite-email"
              label="Correo electrónico"
              type="email"
              placeholder="nuevo.miembro@empresa.com"
              required
            />

            <FormSelect
              control={control}
              name="roleId"
              id="invite-role"
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
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={inviteMemberMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || inviteMemberMutation.isPending}
            >
              {inviteMemberMutation.isPending
                ? 'Enviando...'
                : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
