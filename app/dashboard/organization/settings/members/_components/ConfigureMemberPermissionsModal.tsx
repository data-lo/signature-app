'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganizationPermissions } from '@/lib/hooks/useOrganizationPermissions';
import { useMemberPermissions } from '../_hooks/useMemberPermissions';
import type { OrganizationMember } from '@/lib/api/organization-members';

interface ConfigureMemberPermissionsModalProps {
  member: OrganizationMember | null;
  organizationId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string, permissionIds: string[]) => void;
  confirming?: boolean;
}

export default function ConfigureMemberPermissionsModal({
  member,
  organizationId,
  onOpenChange,
  onConfirm,
  confirming,
}: ConfigureMemberPermissionsModalProps) {
  const open = member !== null;
  const { data: permissions, isLoading: permissionsLoading } =
    useOrganizationPermissions(organizationId, open);
  const { data: memberPermissionIds, isLoading: memberPermissionsLoading } =
    useMemberPermissions(member?.accountId ?? null, open);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set(memberPermissionIds ?? []));
  }, [memberPermissionIds]);

  function toggle(permissionId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  }

  function handleConfirm() {
    if (!member) return;
    onConfirm(member.accountId, Array.from(selectedIds));
  }

  const isLoading = permissionsLoading || memberPermissionsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar permisos</DialogTitle>
          <DialogDescription>
            Selecciona los permisos que tendrá {member?.email} dentro de la
            organización.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando permisos...</p>
        ) : !permissions?.length ? (
          <p className="text-sm text-muted-foreground">
            Esta organización todavía no tiene permisos en su catálogo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {permissions.map((permission) => (
              <Field key={permission.id} orientation="horizontal">
                <Checkbox
                  id={`member-permission-${permission.id}`}
                  checked={selectedIds.has(permission.id)}
                  onCheckedChange={(checked) => toggle(permission.id, checked)}
                />
                <FieldLabel htmlFor={`member-permission-${permission.id}`}>
                  {permission.name}
                  {!permission.isActive && (
                    <span className="text-xs text-muted-foreground">
                      {' '}
                      (Inactivo)
                    </span>
                  )}
                </FieldLabel>
              </Field>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
