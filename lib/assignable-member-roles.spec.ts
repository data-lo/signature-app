import type { RoleData } from '@/lib/api/roles';

import { assignableMemberRoles, OWNER_ROLE_NAME } from './assignable-member-roles';

function role(name: string, isSystemRole = true): RoleData {
  return { id: `${name}-id`, name, isSystemRole, permissions: [] };
}

describe('assignableMemberRoles', () => {
  it('quita OWNER y deja los demás roles, en su orden', () => {
    const roles = [role('ADMIN'), role(OWNER_ROLE_NAME), role('MEMBER'), role('Aprobador', false)];

    expect(assignableMemberRoles(roles).map((r) => r.name)).toEqual([
      'ADMIN',
      'MEMBER',
      'Aprobador',
    ]);
  });

  it('sin catálogo todavía devuelve una lista vacía', () => {
    expect(assignableMemberRoles(undefined)).toEqual([]);
  });

  /** Filtra, no muta: el catálogo en caché lo siguen leyendo otras pantallas con OWNER dentro. */
  it('no modifica el catálogo que recibe', () => {
    const roles = [role(OWNER_ROLE_NAME), role('MEMBER')];

    assignableMemberRoles(roles);

    expect(roles).toHaveLength(2);
  });
});
