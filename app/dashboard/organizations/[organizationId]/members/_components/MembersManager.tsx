'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { updateOrganizationMemberRoleAction } from '@/app/server-actions/organizations/update-organization-member-role.server-action';
import { removeOrganizationMemberAction } from '@/app/server-actions/organizations/remove-organization-member.server-action';
import { updateOrganizationMemberPermissionsAction } from '@/app/server-actions/organizations/update-organization-member-permissions.server-action';
import type { ActionResult } from '@/app/server-actions/organizations/_result';
import type { OrganizationMember } from '@/lib/api/organization-members';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';
import MembersTable from './MembersTable';
import InviteMemberModal from './InviteMemberModal';
import AddMemberModal from './AddMemberModal';
import EditRoleModal from './EditRoleModal';
import RemoveMemberDialog from './RemoveMemberDialog';
import ConfigureMemberPermissionsModal from './ConfigureMemberPermissionsModal';

interface MembersManagerProps {
  organizationId: string;
  /** Miembros ya resueltos en el servidor. Este componente NO los vuelve a pedir. */
  members: OrganizationMember[];
  /** Catálogo de etiquetas de la organización, también resuelto en el servidor. */
  permissions: OrganizationPermission[];
  includeInactive: boolean;
}

/**
 * La parte interactiva de la sección de miembros.
 *
 * Recibe los datos ya resueltos y nunca los consulta: su trabajo es abrir los modales, llamar a
 * los Server Actions y pedirle al enrutador que vuelva a renderizar la sección con lo que haya
 * quedado en el servidor. Por eso no hay aquí ninguna copia local de la lista que pudiera quedar
 * desincronizada de la real.
 *
 * El filtro de miembros dados de baja es un parámetro de la URL y no un estado de React: así lo
 * resuelve el mismo render del servidor que trae la lista, en vez de obligar al navegador a pedir
 * otra vez los miembros al marcar la casilla —que es justo lo que esta migración vino a quitar—.
 * Además deja la vista enlazable y la conserva al recargar.
 *
 * @param props - Organización, datos ya cargados y el filtro activo.
 * @returns La cabecera con las acciones de alta, la tabla y los modales.
 * @throws Nada: los Server Actions devuelven el fallo como resultado y aquí se muestra.
 *
 * @example
 * ```tsx
 * <MembersManager
 *   organizationId="org-1"
 *   members={members}
 *   permissions={permissions}
 *   includeInactive={false}
 * />
 * ```
 */
export default function MembersManager({
  organizationId,
  members,
  permissions,
  includeInactive,
}: MembersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /*
    El gate de administrador se conserva del comportamiento anterior. No es la carga inicial de
    miembros ni de permisos —eso ya viene del servidor—, sino el catálogo de roles, que decide si
    se ofrecen las acciones de cada fila. Sin él, quien sólo puede leer vería botones que el
    backend va a rechazar.
  */
  const { isAdmin, isLoading: roleLoading } = useIsOrganizationAdmin();
  const canManage = isAdmin && !roleLoading;

  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] =
    useState<OrganizationMember | null>(null);
  const [configuringPermissionsMember, setConfiguringPermissionsMember] =
    useState<OrganizationMember | null>(null);

  /**
   * Ejecuta una mutación y deja la sección al día.
   *
   * Centraliza lo que las tres acciones repiten —aviso, cierre del modal y refresco— para que
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
   *   'Miembro eliminado correctamente',
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

  function handleShowInactiveChange(checked: boolean) {
    const path = `/dashboard/organizations/${organizationId}/members`;
    startTransition(() => {
      router.replace(checked ? `${path}?includeInactive=true` : path);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        Dos caminos de alta, a propósito: "Agregar miembro" da de alta de una vez a quien ya tiene
        cuenta, e "Invitar miembro" manda el correo a quien todavía no está registrado.
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
            <AddMemberModal organizationId={organizationId} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive-members"
          checked={includeInactive}
          disabled={isPending}
          onCheckedChange={(checked) =>
            handleShowInactiveChange(checked === true)
          }
        />
        <Label htmlFor="show-inactive-members" className="text-sm font-normal">
          Mostrar miembros dados de baja
        </Label>
      </div>

      <MembersTable
        members={members}
        canManage={canManage}
        onEditRole={setEditingMember}
        onConfigurePermissions={setConfiguringPermissionsMember}
        onRemove={setRemovingMember}
      />

      <EditRoleModal
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

      <ConfigureMemberPermissionsModal
        member={configuringPermissionsMember}
        permissions={permissions}
        onOpenChange={(open) => !open && setConfiguringPermissionsMember(null)}
        onConfirm={(accountId, permissionIds) =>
          runMutation(
            () =>
              updateOrganizationMemberPermissionsAction(
                accountId,
                organizationId,
                permissionIds,
              ),
            'Permisos actualizados correctamente',
            () => setConfiguringPermissionsMember(null),
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
            'Miembro eliminado correctamente',
            () => setRemovingMember(null),
          )
        }
        confirming={isPending}
      />
    </div>
  );
}
