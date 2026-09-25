'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { updateOrganizationMemberRoleAction } from '@/app/server-actions/organizations/update-organization-member-role.server-action';
import { removeOrganizationMemberAction } from '@/app/server-actions/organizations/remove-organization-member.server-action';
import type { ActionResult } from '@/app/server-actions/organizations/_result';
import type { OrganizationMember } from '@/lib/api/organization-members';
import {
  isOwnerMember,
  OWNER_CANNOT_BE_DEACTIVATED_MESSAGE,
  OWNER_ROLE_CANNOT_CHANGE_MESSAGE,
} from '@/lib/assignable-member-roles';
import MembersTable from './MembersTable';
import InviteMemberModal from './InviteMemberModal';
import EditRoleModal from './EditRoleModal';
import RemoveMemberDialog from './RemoveMemberDialog';

interface MembersManagerProps {
  organizationId: string;
  /** Miembros ya resueltos en el servidor. Este componente NO los vuelve a pedir. */
  members: OrganizationMember[];
}

/**
 * La parte interactiva de la sección de miembros.
 *
 * Recibe los datos ya resueltos y nunca los consulta: su trabajo es abrir los modales, llamar a
 * los Server Actions y pedirle al enrutador que vuelva a renderizar la sección con lo que haya
 * quedado en el servidor. Por eso no hay aquí ninguna copia local de la lista que pudiera quedar
 * desincronizada de la real.
 *
 * La tabla muestra a los miembros de la organización; quien fue dado de baja no aparece. El
 * conmutador "Mostrar miembros dados de baja" que había aquí se retiró junto con el parámetro
 * `?includeInactive=true` que lo sostenía: esa vista no debe estar disponible en la interfaz, y
 * es el servidor el que ya no los devuelve.
 *
 * @param props - Organización y datos ya cargados.
 * @returns La cabecera con las acciones de alta, la tabla y los modales.
 * @throws Nada: los Server Actions devuelven el fallo como resultado y aquí se muestra.
 *
 * @example
 * ```tsx
 * <MembersManager
 *   organizationId="org-1"
 *   members={members}
 * />
 * ```
 */
export default function MembersManager({
  organizationId,
  members,
}: MembersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /*
    El gate de administrador se conserva del comportamiento anterior. No es la carga inicial de
    miembros ni de permisos —eso ya viene del servidor—, sino el catálogo de roles, que decide si
    se ofrecen las acciones de cada fila. Sin él, quien sólo puede leer vería botones que el
    backend va a rechazar.
  */
  /**
   * Administrar miembros es invitar, cambiar de rol y dar de baja: tres capacidades distintas del
   * catálogo que hoy se ofrecen juntas en esta pantalla. Se exige la de invitar, que es la que
   * abre el alta; cada acción concreta la vuelve a validar su endpoint, y las dos que sobran
   * (`MEMBER.UPDATE` y `MEMBER.REMOVE`) separarán aquí los controles cuando la pantalla las
   * distinga.
   */
  const { can } = usePermissions();
  const canManage = can('MEMBER.INVITE');

  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] =
    useState<OrganizationMember | null>(null);

  /**
   * Abre el diálogo de baja, salvo sobre el propietario: la tabla ya deshabilita la opción, pero
   * el aviso cubre cualquier otro camino que llegue aquí (historia "Impedir desactivación de
   * cuentas con perfil Owner").
   */
  function requestRemove(member: OrganizationMember) {
    if (isOwnerMember(member)) {
      toast.error(OWNER_CANNOT_BE_DEACTIVATED_MESSAGE);
      return;
    }
    setRemovingMember(member);
  }

  /** Igual que `requestRemove`, para el cambio de rol. */
  function requestEditRole(member: OrganizationMember) {
    if (isOwnerMember(member)) {
      toast.error(OWNER_ROLE_CANNOT_CHANGE_MESSAGE);
      return;
    }
    setEditingMember(member);
  }

  /**
   * Ejecuta una mutación y deja la sección al día.
   *
   * Centraliza lo que las dos acciones repiten —aviso, cierre del modal y refresco— para que
   * ninguna pueda olvidarse del refresco y dejar la tabla mostrando el estado anterior.
   *
   * @param run - La llamada al Server Action.
   * @param successMessage - Qué avisar cuando sale bien.
   * @param onSuccess - Cierre del modal correspondiente.
   * @returns Nada; el resultado se comunica por `toast`.
   * @throws Nada.
   *
   * @example
   * ```ts
   * runMutation(
   *   () => removeOrganizationMemberAction(accountId, organizationId),
   *   'Miembro desactivado correctamente',
   *   () => setRemovingMember(null),
   * );
   * ```
   */
  function runMutation(
    run: () => Promise<ActionResult>,
    successMessage: string,
    onSuccess: () => void,
  ) {
    startTransition(async () => {
      const result = await run();

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(successMessage);
      onSuccess();
      // `revalidatePath` ya invalidó el caché del servidor; esto es lo que hace que ESTA vista
      // vuelva a pedir su render y muestre la lista nueva sin recargar la página.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        Un solo camino de alta: "Invitar miembro". Tenga o no cuenta la persona, recibe un enlace
        y se une identificándose con su RFC en `/join`. El alta directa ("Agregar miembro") se
        retiró: resolvía a la persona por correo, y quien tiene su cuenta con el correo personal
        quedaba fuera.
      */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Miembros</h1>
          <p className="text-sm text-muted-foreground">
            Administra los miembros de tu organización, sus roles y su acceso.
            Los permisos de cada persona son los de su rol.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <InviteMemberModal organizationId={organizationId} />
          </div>
        )}
      </div>

      <MembersTable
        members={members}
        canManage={canManage}
        onEditRole={requestEditRole}
        onRemove={requestRemove}
      />

      <EditRoleModal
        organizationId={organizationId}
        member={editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        onConfirm={(accountId, roleId) =>
          runMutation(
            () =>
              updateOrganizationMemberRoleAction(
                accountId,
                organizationId,
                roleId,
              ),
            'Rol actualizado correctamente',
            () => setEditingMember(null),
          )
        }
        confirming={isPending}
      />

      <RemoveMemberDialog
        member={removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        onConfirm={(accountId) =>
          runMutation(
            () => removeOrganizationMemberAction(accountId, organizationId),
            'Miembro desactivado correctamente',
            () => setRemovingMember(null),
          )
        }
        confirming={isPending}
      />
    </div>
  );
}
