'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useOrganizationMembers } from '../_hooks/useOrganizationMembers';
import { useUpdateMemberRole } from '../_hooks/useUpdateMemberRole';
import { useRemoveMember } from '../_hooks/useRemoveMember';
import { useUpdateMemberPermissions } from '../_hooks/useUpdateMemberPermissions';
import MembersTable from './MembersTable';
import EditRoleModal from './EditRoleModal';
import RemoveMemberDialog from './RemoveMemberDialog';
import ConfigureMemberPermissionsModal from './ConfigureMemberPermissionsModal';
import type { OrganizationMember } from '@/lib/api/organization-members';

export default function MembersView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { isAdmin, isLoading: roleLoading } = useIsOrganizationAdmin();
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] =
    useState<OrganizationMember | null>(null);
  const [configuringPermissionsMember, setConfiguringPermissionsMember] =
    useState<OrganizationMember | null>(null);

  const organizationId = activeAccount?.organizationId ?? null;
  const {
    data: members,
    isLoading: membersLoading,
  } = useOrganizationMembers(organizationId, isAdmin);
  const updateRoleMutation = useUpdateMemberRole(organizationId);
  const removeMemberMutation = useRemoveMember(organizationId);
  const updateMemberPermissionsMutation = useUpdateMemberPermissions();

  if (activeAccount?.accountType !== 'ORGANIZATION') {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona una organización para gestionar sus miembros.
      </p>
    );
  }

  if (roleLoading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para gestionar los miembros de esta organización.
      </p>
    );
  }

  function handleConfirmEditRole(accountId: string, roleId: string) {
    updateRoleMutation.mutate(
      { accountId, roleId },
      { onSuccess: () => setEditingMember(null) },
    );
  }

  function handleConfirmRemove(accountId: string) {
    removeMemberMutation.mutate(accountId, {
      onSuccess: () => setRemovingMember(null),
    });
  }

  function handleConfirmConfigurePermissions(
    accountId: string,
    permissionIds: string[],
  ) {
    updateMemberPermissionsMutation.mutate(
      { accountId, permissionIds },
      { onSuccess: () => setConfiguringPermissionsMember(null) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Miembros</h1>
        <p className="text-sm text-muted-foreground">
          Administra los miembros de tu organización, sus roles y su acceso.
        </p>
      </div>

      {membersLoading ? (
        <p className="text-sm text-muted-foreground">Cargando miembros...</p>
      ) : (
        <MembersTable
          members={members ?? []}
          canManage
          onEditRole={setEditingMember}
          onConfigurePermissions={setConfiguringPermissionsMember}
          onRemove={setRemovingMember}
        />
      )}

      <EditRoleModal
        member={editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        onConfirm={handleConfirmEditRole}
        confirming={updateRoleMutation.isPending}
      />

      <ConfigureMemberPermissionsModal
        member={configuringPermissionsMember}
        organizationId={organizationId}
        onOpenChange={(open) => !open && setConfiguringPermissionsMember(null)}
        onConfirm={handleConfirmConfigurePermissions}
        confirming={updateMemberPermissionsMutation.isPending}
      />

      <RemoveMemberDialog
        member={removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        onConfirm={handleConfirmRemove}
        confirming={removeMemberMutation.isPending}
      />
    </div>
  );
}
