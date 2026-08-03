'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useOrganizationPermissions } from '@/lib/hooks/useOrganizationPermissions';
import { useUpdateOrganizationPermission } from '../_hooks/useUpdateOrganizationPermission';
import { useDeleteOrganizationPermission } from '../_hooks/useDeleteOrganizationPermission';
import PermissionsTable from './PermissionsTable';
import CreatePermissionModal from './CreatePermissionModal';
import EditPermissionModal from './EditPermissionModal';
import DeletePermissionDialog from './DeletePermissionDialog';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

export default function PermissionsView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { isAdmin, isLoading: roleLoading } = useIsOrganizationAdmin();
  const [editingPermission, setEditingPermission] =
    useState<OrganizationPermission | null>(null);
  const [deletingPermission, setDeletingPermission] =
    useState<OrganizationPermission | null>(null);

  const organizationId = activeAccount?.organizationId ?? null;
  const { data: permissions, isLoading: permissionsLoading } =
    useOrganizationPermissions(organizationId, isAdmin);
  const updatePermissionMutation = useUpdateOrganizationPermission(organizationId);
  const deletePermissionMutation = useDeleteOrganizationPermission(organizationId);

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona una organización para gestionar sus permisos.
      </p>
    );
  }

  if (roleLoading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para gestionar los permisos de esta organización.
      </p>
    );
  }

  function handleConfirmEdit(
    permissionId: string,
    changes: { name: string; isActive: boolean },
  ) {
    updatePermissionMutation.mutate(
      { permissionId, changes },
      { onSuccess: () => setEditingPermission(null) },
    );
  }

  function handleConfirmDelete(permissionId: string) {
    deletePermissionMutation.mutate(permissionId, {
      onSuccess: () => setDeletingPermission(null),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Permisos</h1>
          <p className="text-sm text-muted-foreground">
            Administra el catálogo de permisos de tu organización.
          </p>
        </div>
        <CreatePermissionModal organizationId={organizationId as string} />
      </div>

      {permissionsLoading ? (
        <p className="text-sm text-muted-foreground">Cargando permisos...</p>
      ) : (
        <PermissionsTable
          permissions={permissions ?? []}
          canManage
          onEdit={setEditingPermission}
          onDelete={setDeletingPermission}
        />
      )}

      <EditPermissionModal
        permission={editingPermission}
        onOpenChange={(open) => !open && setEditingPermission(null)}
        onConfirm={handleConfirmEdit}
        confirming={updatePermissionMutation.isPending}
      />

      <DeletePermissionDialog
        permission={deletingPermission}
        onOpenChange={(open) => !open && setDeletingPermission(null)}
        onConfirm={handleConfirmDelete}
        confirming={deletePermissionMutation.isPending}
      />
    </div>
  );
}
