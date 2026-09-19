import type { PermissionKey } from './authorization.types';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from './permissions';

const MEMBER_PERMISSIONS: PermissionKey[] = [
  'DOCUMENT.CREATE',
  'DOCUMENT.READ_OWN',
  'DOCUMENT.SIGN_SELF',
];

describe('hasPermission', () => {
  it('reconoce un permiso concedido', () => {
    expect(hasPermission(MEMBER_PERMISSIONS, 'DOCUMENT.READ_OWN')).toBe(true);
  });

  it('rechaza uno que no está', () => {
    expect(hasPermission(MEMBER_PERMISSIONS, 'BILLING.READ')).toBe(false);
  });

  /**
   * `DOCUMENT.READ_OWN` y `DOCUMENT.READ_ORGANIZATION` comparten recurso y acción y sólo se
   * distinguen por el alcance. La comparación es por clave completa, así que tener uno no
   * concede el otro.
   */
  it('no confunde dos alcances de la misma acción', () => {
    expect(hasPermission(MEMBER_PERMISSIONS, 'DOCUMENT.READ_ORGANIZATION')).toBe(
      false,
    );
  });

  it('sin permisos no concede nada', () => {
    expect(hasPermission([], 'DOCUMENT.READ_OWN')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('permite cuando existe al menos uno', () => {
    expect(
      hasAnyPermission(MEMBER_PERMISSIONS, [
        'DOCUMENT.READ_OWN',
        'DOCUMENT.READ_ORGANIZATION',
      ]),
    ).toBe(true);
  });

  it('rechaza cuando no existe ninguno', () => {
    expect(
      hasAnyPermission(MEMBER_PERMISSIONS, ['BILLING.READ', 'BILLING.MANAGE']),
    ).toBe(false);
  });

  /**
   * Es lo contrario de lo que haría `Array.prototype.some` por su cuenta, y es deliberado: una
   * entrada de menú sin requisitos declarados es casi siempre un olvido, y fallar cerrado hace
   * que se note en vez de abrirla a todo el mundo.
   */
  it('una lista de requisitos vacía NO concede acceso', () => {
    expect(hasAnyPermission(MEMBER_PERMISSIONS, [])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('exige todos los permisos', () => {
    expect(
      hasAllPermissions(MEMBER_PERMISSIONS, [
        'DOCUMENT.CREATE',
        'DOCUMENT.SIGN_SELF',
      ]),
    ).toBe(true);
  });

  it('rechaza si falta uno solo', () => {
    expect(
      hasAllPermissions(MEMBER_PERMISSIONS, [
        'DOCUMENT.CREATE',
        'DOCUMENT.APPROVE',
      ]),
    ).toBe(false);
  });

  /** "No exige nada" y "las exige todas y no hay ninguna" son la misma frase. */
  it('una lista de requisitos vacía se cumple', () => {
    expect(hasAllPermissions([], [])).toBe(true);
  });
});
