import type { OrganizationRole } from '@/lib/api/organization-roles';

import {
  assignableMemberRoles,
  isOwnerMember,
  OWNER_ROLE_NAME,
} from './assignable-member-roles';

function role(name: string, isSystemRole = true): OrganizationRole {
  return {
    id: `${name}-id`,
    name,
    isSystemRole,
    permissions: [],
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('assignableMemberRoles', () => {
  it('excluye el OWNER de sistema y conserva el resto en su orden', () => {
    const roles = [role('ADMIN'), role(OWNER_ROLE_NAME), role('MEMBER'), role('Aprobador', false)];

    expect(assignableMemberRoles(roles).map((r) => r.name)).toEqual([
      'ADMIN',
      'MEMBER',
      'Aprobador',
    ]);
  });

  /**
   * Se filtra por la clave del rol, no por el texto que se ve: "PROPIETARIO" es sólo la etiqueta
   * del OWNER de sistema, y un rol personalizado con ese nombre es de la organización.
   */
  it('no esconde un rol personalizado por su nombre visible', () => {
    expect(
      assignableMemberRoles([role('PROPIETARIO', false)]).map((r) => r.name),
    ).toEqual(['PROPIETARIO']);
  });

  it('sin roles todavía devuelve una lista vacía', () => {
    expect(assignableMemberRoles(undefined)).toEqual([]);
  });

  /** Filtra, no muta: el catálogo en caché lo siguen leyendo otras pantallas con OWNER dentro. */
  it('no modifica la lista que recibe', () => {
    const roles = [role(OWNER_ROLE_NAME), role('MEMBER')];

    assignableMemberRoles(roles);

    expect(roles).toHaveLength(2);
  });
});

/** Historia "Impedir desactivación de cuentas con perfil Owner". */
describe('isOwnerMember', () => {
  it('reconoce al propietario por su rol', () => {
    expect(isOwnerMember({ role: { name: OWNER_ROLE_NAME } })).toBe(true);
  });

  it.each([['ADMIN'], ['MEMBER'], ['Propietario']])(
    'un rol %s no es el propietario',
    (name) => {
      expect(isOwnerMember({ role: { name } })).toBe(false);
    },
  );

  it('sin rol no es el propietario', () => {
    expect(isOwnerMember({ role: null })).toBe(false);
  });
});
