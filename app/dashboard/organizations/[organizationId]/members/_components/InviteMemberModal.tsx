'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { Form } from '@/components/form/form';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useOrganizationRoles } from '@/lib/hooks/useOrganizationRoles';
import { assignableMemberRoles } from '@/lib/assignable-member-roles';
import { DEFAULT_MEMBER_ROLE_NAME } from '@/lib/format-role-name';
import { inviteOrganizationMemberAction } from '@/app/server-actions/organizations/invite-organization-member.server-action';
import { inviteMemberSchema, type InviteMemberFormValues } from '../_schemas';
import InviteMemberRoleSelect from './InviteMemberRoleSelect';

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
 * Los roles son los de la ORGANIZACIÓN (`GET /organizations/:organizationId/roles`: los de
 * sistema más los propios), no sólo los de sistema: así se puede invitar con un rol
 * personalizado. Se piden al abrir el modal y no antes, y OWNER nunca se ofrece. Mientras cargan
 * —o si fallan— el envío queda deshabilitado: sin roles no hay rol válido que mandar.
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
  const organizationRolesQuery = useOrganizationRoles(organizationId, open);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    mode: 'onChange',
    defaultValues: { email: '', roleId: '' },
  });

  /** Hay roles que elegir: la consulta terminó bien. Sin esto no se puede enviar. */
  const rolesReady = organizationRolesQuery.isSuccess;

  const defaultRoleId = assignableMemberRoles(organizationRolesQuery.data).find(
    (role) => role.isSystemRole && role.name === DEFAULT_MEMBER_ROLE_NAME,
  )?.id;

  /**
   * A quien se invita se le propone MIEMBRO, el rol mínimo del catálogo: subirlo es una decisión
   * consciente de quien administra, no el descuido de no tocar el selector. Se aplica al llegar
   * el catálogo y en cada apertura, porque al cerrar el modal `reset()` vacía el campo.
   */
  useEffect(() => {
    if (!open || !defaultRoleId) return;
    setValue('roleId', defaultRoleId, { shouldValidate: true });
  }, [open, defaultRoleId, setValue]);

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
    // El botón ya está deshabilitado sin roles; esto cubre también el envío con Enter.
    if (!rolesReady) return;

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

            <InviteMemberRoleSelect
              control={control}
              rolesQuery={organizationRolesQuery}
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
            <Button
              type="submit"
              disabled={!rolesReady || !isValid || isPending}
            >
              {isPending ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
