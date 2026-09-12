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
import { useMemberPermissions } from '../_hooks/useMemberPermissions';
import type { OrganizationMember } from '@/lib/api/organization-members';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

/**
 * Asignación de las etiquetas de `organization_permissions`.
 *
 * Es un sistema PARALELO al RBAC y no una extensión: son nombres libres que cada organización
 * define ("puede aprobar gastos") y que no dan acceso técnico a ningún endpoint. Los permisos
 * efectivos vienen del rol (`role_permissions`), y por eso el texto de este modal evita hablar de
 * "permisos" a secas — presentarlo como control de acceso haría creer que aquí se abre o cierra
 * algo que en realidad se decide en el rol.
 *
 * El catálogo de la organización llega como prop, ya resuelto en el servidor junto con los
 * miembros: abrir este modal ya no dispara una consulta para pintarlo.
 *
 * Lo que sí se pide al abrir son las etiquetas que ESTE miembro tiene marcadas hoy. Es un dato
 * por persona, así que traerlo en el render del servidor obligaría a una petición por fila para
 * un panel que casi siempre no se abre. No es la carga inicial de la sección; es una consulta
 * perezosa de un panel bajo demanda.
 */
interface ConfigureMemberPermissionsModalProps {
  member: OrganizationMember | null;
  /** Catálogo de la organización, resuelto en el servidor. */
  permissions: OrganizationPermission[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string, permissionIds: string[]) => void;
  confirming?: boolean;
}

export default function ConfigureMemberPermissionsModal({
  member,
  permissions,
  onOpenChange,
  onConfirm,
  confirming,
}: ConfigureMemberPermissionsModalProps) {
  const open = member !== null;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetas del catálogo de la organización</DialogTitle>
          <DialogDescription>
            Marca las etiquetas del catálogo propio de tu organización que
            aplican a {member?.email}. Son informativas y NO otorgan accesos: lo
            que esta persona puede hacer lo define su rol, en &quot;Editar
            Rol&quot;.
          </DialogDescription>
        </DialogHeader>

        {memberPermissionsLoading ? (
          <p className="text-sm text-muted-foreground">Cargando permisos...</p>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta organización todavía no tiene etiquetas en su catálogo.
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
