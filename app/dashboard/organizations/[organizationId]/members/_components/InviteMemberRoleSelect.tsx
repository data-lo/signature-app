'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';

import { FormSelect } from '@/components/form/form-select';
import { FormSelectSkeleton } from '@/components/ui/form-select-skeleton';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import { assignableMemberRoles } from '@/lib/assignable-member-roles';
import { formatRoleName } from '@/lib/format-role-name';

import MemberRolesLoadError from './MemberRolesLoadError';

import type { InviteMemberFormValues } from '../_schemas';

interface InviteMemberRoleSelectProps {
  control: Control<InviteMemberFormValues>;
  /** Consulta de los roles de la organización activa (`useOrganizationRoles`). */
  rolesQuery: UseQueryResult<OrganizationRole[]>;
}

/*
  El texto del error se re-exporta desde aquí porque es donde nació y desde donde ya lo importan
  las pruebas; su definición se mudó a `MemberRolesLoadError`, que lo comparte con el modal de
  editar rol.
*/
export { ROLES_LOAD_ERROR_MESSAGE } from './MemberRolesLoadError';

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
    return <MemberRolesLoadError />;
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
