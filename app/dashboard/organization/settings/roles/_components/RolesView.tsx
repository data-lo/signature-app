'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useOrganizationRoles } from '@/lib/hooks/useOrganizationRoles';
import { useUpdateOrganizationRole } from '../_hooks/useUpdateOrganizationRole';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import RolesTable from './RolesTable';
import CreateOrganizationRoleModal from './CreateOrganizationRoleModal';
import EditOrganizationRoleModal from './EditOrganizationRoleModal';

export default function RolesView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { isAdmin, isLoading: roleLoading } = useIsOrganizationAdmin();
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);

  const organizationId = activeAccount?.organizationId ?? null;
  const { data: roles, isLoading: rolesLoading } = useOrganizationRoles(
    organizationId,
    isAdmin,
  );
  const updateRoleMutation = useUpdateOrganizationRole(organizationId);

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona una organización para gestionar sus roles.
      </p>
    );
  }

  if (roleLoading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (!isAdmin) {
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
        {organizationId && (
          <CreateOrganizationRoleModal
            organizationId={organizationId}
            availablePermissions={availablePermissions}
          />
        )}
      </div>

      {rolesLoading ? (
        <p className="text-sm text-muted-foreground">Cargando roles...</p>
      ) : (
        <RolesTable roles={roles ?? []} canManage onEdit={setEditingRole} />
      )}

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
