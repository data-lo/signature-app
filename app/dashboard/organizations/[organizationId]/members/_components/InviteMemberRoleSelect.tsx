'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';

import { FormSelect } from '@/components/form/form-select';
import { FormSelectSkeleton } from '@/components/ui/form-select-skeleton';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import { assignableMemberRoles } from '@/lib/assignable-member-roles';
import { formatRoleName } from '@/lib/format-role-name';

import type { InviteMemberFormValues } from '../_schemas';

interface InviteMemberRoleSelectProps {
  control: Control<InviteMemberFormValues>;
  /** Consulta de los roles de la organización activa (`useOrganizationRoles`). */
  rolesQuery: UseQueryResult<OrganizationRole[]>;
}

/** Texto del error. Dice qué hacer, no qué falló por dentro. */
export const ROLES_LOAD_ERROR_MESSAGE =
  'No pudimos cargar los roles de la organización. Cierra la ventana y vuelve a abrirla para reintentar.';

/**
 * El selector de rol del modal "Invitar miembro", con sus tres estados: cargando, error y listo.
 *
 * Mientras llegan los roles se muestra un skeleton en lugar de un selector vacío, que parecería
 * no tener opciones. Si la consulta falla se muestra un error que dice cómo reintentar. En los
 * dos casos no hay rol elegible, y el modal mantiene deshabilitado el envío.
 *
 * Las opciones pasan por `assignableMemberRoles`, que excluye el rol OWNER.
 *
 * @param props - Control del formulario y la consulta de roles.
 * @returns El skeleton, el error, o el selector con los roles asignables.
 *
 * @example
 * ```tsx
 * <InviteMemberRoleSelect control={control} rolesQuery={organizationRolesQuery} />
 * ```
 */
export default function InviteMemberRoleSelect({
  control,
  rolesQuery,
}: InviteMemberRoleSelectProps) {
  if (rolesQuery.isPending) {
    return <FormSelectSkeleton label="Rol" />;
  }

  if (rolesQuery.isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{ROLES_LOAD_ERROR_MESSAGE}</span>
      </div>
    );
  }

  return (
    <FormSelect
      control={control}
      name="roleId"
      id="invite-role"
      label="Rol"
      required
      placeholder="Selecciona un rol"
      options={assignableMemberRoles(rolesQuery.data).map((role) => ({
        value: role.id,
        label: formatRoleName(role.name),
      }))}
    />
  );
}
