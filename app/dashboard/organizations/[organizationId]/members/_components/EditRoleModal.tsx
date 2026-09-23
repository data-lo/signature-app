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
import { FormSelectSkeleton } from '@/components/ui/form-select-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizationRoles } from '@/lib/hooks/useOrganizationRoles';
import { assignableMemberRoles } from '@/lib/assignable-member-roles';
import type { OrganizationMember } from '@/lib/api/organization-members';
import { formatRoleName } from '@/lib/format-role-name';
import MemberRolesLoadError from './MemberRolesLoadError';
import RolePermissionsPreview from './RolePermissionsPreview';

/**
 * Cambio de rol de una membresía existente.
 *
 * Los roles son los de la ORGANIZACIÓN (`GET /organizations/:organizationId/roles`: los de
 * sistema más los propios de ella) y no el catálogo de sistema, que era lo que este modal pedía
 * antes. Aquello tenía dos consecuencias visibles: ofrecía PROPIETARIO —un rol que no se
 * reparte— y dejaba fuera los roles personalizados, así que a quien tenía uno el selector le
 * mostraba el identificador crudo de su rol en lugar de su nombre, porque el rol no estaba entre
 * las opciones con las que el control resuelve la etiqueta.
 *
 * Las opciones pasan por `assignableMemberRoles`, el mismo filtro que usa "Invitar miembro". El
 * rol ACTUAL del miembro se agrega igualmente al mapa de etiquetas aunque no sea asignable: el
 * propietario tiene que verse como PROPIETARIO al abrir su edición —ése es su rol real— aunque
 * nadie pueda elegirlo desde la lista.
 *
 * Debajo del selector se listan los permisos del rol elegido: cambiar de rol es cambiar lo que
 * esa persona puede hacer, y la historia pide que eso se vea ANTES de confirmar. Lo que se
 * guarda es el rol; la pantalla nunca escribe permisos sueltos por miembro.
 */
interface EditRoleModalProps {
  /** Organización de la membresía; de ella salen los roles que se pueden asignar. */
  organizationId: string;
  member: OrganizationMember | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string, roleId: string) => void;
  confirming?: boolean;
}

/**
 * El modal de "Editar rol" con sus tres estados: cargando, error y listo.
 *
 * @param props - Organización, miembro en edición, cierres y el indicador de guardado.
 * @returns El diálogo con el selector de rol y la vista previa de permisos.
 * @throws Nada: el fallo de la consulta se muestra dentro del propio modal.
 *
 * @example
 * ```tsx
 * <EditRoleModal
 *   organizationId="org-1"
 *   member={editingMember}
 *   onOpenChange={(open) => !open && setEditingMember(null)}
 *   onConfirm={(accountId, roleId) => updateRole(accountId, roleId)}
 * />
 * ```
 */
export default function EditRoleModal({
  organizationId,
  member,
  onOpenChange,
  onConfirm,
  confirming,
}: EditRoleModalProps) {
  const open = member !== null;
  const rolesQuery = useOrganizationRoles(organizationId, open);
  const [roleId, setRoleId] = useState<string | null>(null);

  useEffect(() => {
    setRoleId(member?.role?.id ?? null);
  }, [member]);

  const assignableRoles = assignableMemberRoles(rolesQuery.data);
  const currentRole = member?.role ?? null;

  /*
    `items` es lo que el control usa para resolver la ETIQUETA del valor elegido: sin una entrada
    para el rol actual, el trigger pinta el valor crudo —el UUID del rol—. Por eso el rol del
    miembro entra aquí aunque esté fuera de las opciones asignables, que es el caso del
    propietario.
  */
  const assignableOptions = assignableRoles.map((role) => ({
    value: role.id,
    label: formatRoleName(role.name),
  }));
  const currentRoleIsAssignable = assignableRoles.some(
    (role) => role.id === currentRole?.id,
  );
  const roleItems =
    currentRole && !currentRoleIsAssignable
      ? [
          ...assignableOptions,
          { value: currentRole.id, label: formatRoleName(currentRole.name) },
        ]
      : assignableOptions;

  /*
    La vista previa busca en el catálogo COMPLETO y no entre los asignables: si quien se edita es
    el propietario, sus permisos se siguen pudiendo consultar aunque su rol no se pueda repartir.
  */
  const selectedRole = rolesQuery.data?.find((role) => role.id === roleId);

  function handleConfirm() {
    if (!member || !roleId) return;
    onConfirm(member.accountId, roleId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo rol para {member?.email} dentro de la
            organización.
          </DialogDescription>
        </DialogHeader>

        {rolesQuery.isPending ? (
          <FormSelectSkeleton label="Rol" />
        ) : rolesQuery.isError ? (
          <MemberRolesLoadError />
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="edit-role-select">Rol</FieldLabel>
              <Select
                items={roleItems}
                value={roleId}
                onValueChange={(value) => setRoleId(value)}
              >
                <SelectTrigger id="edit-role-select" className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {formatRoleName(role.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <RolePermissionsPreview
              roleName={selectedRole?.name}
              permissions={selectedRole?.permissions ?? []}
            />
          </>
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
          {/*
            Sin catálogo no hay rol válido que mandar: el envío queda deshabilitado mientras los
            roles cargan y si la consulta falla, igual que en "Invitar miembro".
          */}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!roleId || !rolesQuery.isSuccess || confirming}
          >
            {confirming ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
