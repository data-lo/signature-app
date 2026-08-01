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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useInviteMember } from '../_hooks/useInviteMember';
import {
  inviteMemberSchema,
  type InviteMemberFormValues,
} from '../_invite-member-schema';

export default function InviteMemberModal() {
  const [open, setOpen] = useState(false);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { data: roles, isLoading: rolesLoading } = useSystemRoles(open);
  const inviteMemberMutation = useInviteMember();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    mode: 'onChange',
    defaultValues: { email: '', roleId: '' },
  });

  const roleId = watch('roleId');

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
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <TextField
              id="invite-email"
              label="Correo electrónico"
              type="email"
              placeholder="nuevo.miembro@empresa.com"
              error={errors.email}
              {...register('email')}
            />

            <Field data-invalid={errors.roleId ? true : undefined}>
              <FieldLabel htmlFor="invite-role">Rol</FieldLabel>
              <Select
                value={roleId || null}
                onValueChange={(value) =>
                  setValue('roleId', value ?? '', { shouldValidate: true })
                }
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue
                    placeholder={
                      rolesLoading ? 'Cargando roles...' : 'Selecciona un rol'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={errors.roleId ? [errors.roleId] : undefined}
              />
            </Field>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
