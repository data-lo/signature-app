'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
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
import { inviteOrganizationMemberAction } from '@/app/server-actions/organizations/invite-organization-member.server-action';
import { inviteMemberSchema, type InviteMemberFormValues } from '../_schemas';

interface InviteMemberModalProps {
  organizationId: string;
}

/**
 * Invitación por correo de alguien que todavía no tiene cuenta.
 *
 * El envío va por Server Action y no por `apiClient`: la petición sale del servidor de Next con
 * la cookie de sesión, y el navegador nunca habla directamente con el backend. El
 * `activeAccount.id` se lee del store y se pasa como argumento porque el backend resuelve la
 * organización desde ese header y el servidor no puede leer `localStorage`.
 *
 * Tras invitar se refresca la ruta: la persona invitada aparece en el listado con el estado
 * "Invitación pendiente", que es la confirmación que el administrador espera ver.
 *
 * @param props - Organización activa, para revalidar su sección al terminar.
 * @returns El botón de invitar con su formulario en un modal.
 * @throws Nada: el Server Action devuelve el rechazo como resultado y aquí se avisa.
 *
 * @example
 * ```tsx
 * <InviteMemberModal organizationId={organizationId} />
 * ```
 */
export default function InviteMemberModal({
  organizationId,
}: InviteMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const systemRolesQuery = useSystemRoles(open);

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

  const accountId = activeAccount.id;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function onSubmit(values: InviteMemberFormValues) {
    startTransition(async () => {
      const result = await inviteOrganizationMemberAction(
        accountId,
        organizationId,
        values,
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success('Invitación enviada correctamente');
      handleOpenChange(false);
      router.refresh();
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
            Ingresa el correo del nuevo miembro y selecciona su rol dentro de la
            organización.
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
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
