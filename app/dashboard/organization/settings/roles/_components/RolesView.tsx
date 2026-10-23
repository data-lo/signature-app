'use client';

import { useState } from 'react';
import { DataTablePageHeader } from '@/components/data-table/data-table-page-header';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganizationRoles } from '@/lib/hooks/useOrganizationRoles';
import { useUpdateOrganizationRole } from '../_hooks/useUpdateOrganizationRole';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import RolesTable from './RolesTable';
import CreateOrganizationRoleModal from './CreateOrganizationRoleModal';
import EditOrganizationRoleModal from './EditOrganizationRoleModal';

/** Texto del error de carga. Dice qué hacer, no qué falló por dentro. */
export const ROLES_LOAD_ERROR_MESSAGE =
  'No pudimos cargar los roles. Vuelve a intentarlo en un momento.';

/**
 * "Roles y permisos" de la organización activa: la tabla de roles, el alta y la edición.
 *
 * Ver con `ROLE.READ`; crear y editar con `ROLE.MANAGE`. La cabecera y la tabla siguen la
 * estructura de Documentos (`DataTablePageHeader`, `RolesTable`): la carga y el error se pintan
 * dentro de la tarjeta de la tabla y no como texto suelto.
 *
 * @returns La pantalla de roles, o el motivo por el que no hay nada que mostrar.
 *
 * @example
 * ```tsx
 * <RolesView />
 * ```
 */
export default function RolesView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  /**
   * Antes esto preguntaba si el rol se llamaba OWNER o ADMIN, lo que obligaba a resolver el
   * `roleId` contra el catálogo de roles —una consulta más— y dejaba fuera a cualquier rol
   * personalizado con `ROLE.READ`. Ahora se pregunta por la capacidad, que es lo que el backend
   * comprueba de verdad.
   */
  const { can } = usePermissions();
  const canReadRoles = can('ROLE.READ');
  const canManageRoles = can('ROLE.MANAGE');
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);

  const organizationId = activeAccount?.organizationId ?? null;
  const rolesQuery = useOrganizationRoles(organizationId, canReadRoles);
  const roles = rolesQuery.data;
  const updateRoleMutation = useUpdateOrganizationRole(organizationId);

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona una organización para gestionar sus roles.
      </p>
    );
  }

  if (!canReadRoles) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para gestionar los roles de esta organización.
      </p>
    );
  }

  // ADMIN trae de fábrica todo el catálogo estático salvo MEMBER.REMOVE (ver
  // STATIC_ROLE_PERMISSION_MATRIX en signature-server) — se usa para ofrecer los permisos al
  // crear/editar, sin duplicar el catálogo en el frontend.
  const adminRole = roles?.find(
    (role) => role.isSystemRole && role.name === 'ADMIN',
  );
  const availablePermissions = adminRole?.permissions ?? [];

  function handleConfirmEdit(
    roleId: string,
    values: { name: string; permissionKeys: string[] },
  ) {
    updateRoleMutation.mutate(
      { roleId, changes: values },
      { onSuccess: () => setEditingRole(null) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTablePageHeader
        title="Roles y permisos"
        description="Administra los roles de tu organización. Los roles personalizados sólo usan los permisos técnicos del catálogo."
        actions={
          organizationId &&
          canManageRoles && (
            <CreateOrganizationRoleModal
              organizationId={organizationId}
              availablePermissions={availablePermissions}
            />
          )
        }
      />

      <RolesTable
        roles={roles ?? []}
        canManage={canManageRoles}
        onEdit={setEditingRole}
        isLoading={rolesQuery.isLoading}
        errorMessage={rolesQuery.isError ? ROLES_LOAD_ERROR_MESSAGE : undefined}
      />

      {/*
        Editar es `ROLE.MANAGE`, no `ROLE.READ`: quien sólo puede consultar ve la tabla y no la
        modal. El endpoint lo vuelve a exigir de todas formas.
      */}
      <EditOrganizationRoleModal
        role={editingRole}
        availablePermissions={availablePermissions}
        onOpenChange={(open) => !open && setEditingRole(null)}
        onConfirm={handleConfirmEdit}
        confirming={updateRoleMutation.isPending}
      />
    </div>
  );
}
