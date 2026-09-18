'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganizationRoles } from '../_hooks/useOrganizationRoles';
import { useUpdateOrganizationRole } from '../_hooks/useUpdateOrganizationRole';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import RolesTable from './RolesTable';
import CreateOrganizationRoleModal from './CreateOrganizationRoleModal';
import EditOrganizationRoleModal from './EditOrganizationRoleModal';

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
  const { data: roles, isLoading: rolesLoading } = useOrganizationRoles(
    organizationId,
    canReadRoles,
  );
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Roles y permisos</h1>
          <p className="text-sm text-muted-foreground">
            Administra los roles de tu organización. Los roles personalizados
            sólo usan los permisos técnicos del catálogo.
          </p>
        </div>
        {organizationId && canManageRoles && (
          <CreateOrganizationRoleModal
            organizationId={organizationId}
            availablePermissions={availablePermissions}
          />
        )}
      </div>

      {rolesLoading ? (
        <p className="text-sm text-muted-foreground">Cargando roles...</p>
      ) : (
        <RolesTable
          roles={roles ?? []}
          canManage={canManageRoles}
          onEdit={setEditingRole}
        />
      )}

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
