import { NAV_GROUPS, visibleNavGroups } from './AppSidebar';
import { DOCUMENTS_SECTIONS } from '@/app/dashboard/documents/_config/sections';
import type { PermissionKey } from '@/lib/authorization/authorization.types';

/**
 * Todos los permisos del catálogo. Las pruebas de contexto —tipo de cuenta y plan— se hacen con
 * un rol que lo puede todo, para que lo único que decida sea lo que esa prueba está mirando.
 */
const ALL_PERMISSIONS: PermissionKey[] = [
  'ORGANIZATION.READ',
  'ORGANIZATION.UPDATE',
  'BILLING.READ',
  'BILLING.MANAGE',
  'MEMBER.READ',
  'MEMBER.INVITE',
  'MEMBER.UPDATE',
  'MEMBER.REMOVE',
  'ROLE.READ',
  'ROLE.MANAGE',
  'DOCUMENT.CREATE',
  'DOCUMENT.READ_OWN',
  'DOCUMENT.READ_ORGANIZATION',
  'DOCUMENT.SEND_SIGNATURE_REQUEST',
  'DOCUMENT.SIGN_SELF',
  'DOCUMENT.APPROVE',
  'DOCUMENT.CANCEL',
];

/**
 * Claves de los grupos visibles, para comparar sin depender de rótulos ni iconos.
 *
 * @param options - Tipo de cuenta, bloqueo por plan y, si la prueba lo necesita, los permisos;
 *   por defecto se pasan todos, para que sólo decida lo que la prueba está mirando.
 * @returns Las claves de los grupos visibles, en orden.
 *
 * @example
 * visibleKeys({ accountType: 'PERSONAL', lockedWithoutPlan: false }); // ['documents', 'payments', 'settings']
 */
function visibleKeys(
  options: Omit<Parameters<typeof visibleNavGroups>[1], 'permissions'> & {
    permissions?: readonly PermissionKey[];
  },
) {
  return visibleNavGroups(NAV_GROUPS, {
    permissions: ALL_PERMISSIONS,
    ...options,
  }).map((group) => group.key);
}

describe('visibleNavGroups', () => {
  it('a una cuenta personal le muestra todo menos la configuración de organización', () => {
    expect(
      visibleKeys({ accountType: 'PERSONAL', lockedWithoutPlan: false }),
    ).toEqual(['documents', 'payments', 'settings']);
  });

  it('a una organización con plan le muestra también su configuración', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: false }),
    ).toEqual(['documents', 'payments', 'settings', 'organization']);
  });

  /**
   * Pagos y Organización. Lo operativo —documentos y firmas— sí queda fuera: la guarda lo
   * mandaría de vuelta a Planes. La administración se queda porque quien crea la organización es
   * su administrador desde el alta, y un menú con una sola opción en la organización que acaba de
   * crear no le deja hacer nada de lo que su rol le permite.
   */
  it('a una organización sin plan le muestra Pagos y su administración', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: true }),
    ).toEqual(['payments', 'organization']);
  });
});

describe('grupo de documentos', () => {
  /**
   * El alta dejó de ser una entrada del menú: se llega a ella por el botón de la pantalla de
   * Documentos. Sin esta prueba, reponerla en `DOCUMENTS_NAV_SECTIONS` volvería a partir el
   * módulo en dos entradas hermanas sin que nada avisara.
   */
  it('deja una sola entrada, la del listado', () => {
    const documents = NAV_GROUPS.find((group) => group.key === 'documents');

    expect(documents?.items).toHaveLength(1);
    expect(documents?.items[0]).toMatchObject({
      label: DOCUMENTS_SECTIONS.list.label,
      href: DOCUMENTS_SECTIONS.list.href,
    });
  });

  /** El alta y el detalle son pantallas del módulo: la entrada sigue marcada estando en ellas. */
  it('marca la entrada como activa en las rutas hijas del módulo', () => {
    const isActive = NAV_GROUPS.find((group) => group.key === 'documents')!
      .items[0].isActive;

    expect(isActive(DOCUMENTS_SECTIONS.list.href)).toBe(true);
    expect(isActive(DOCUMENTS_SECTIONS.create.href)).toBe(true);
    expect(isActive('/dashboard/documents/doc-1')).toBe(true);
    expect(isActive('/dashboard/plans')).toBe(false);
  });
});

describe('filtrado por permisos', () => {
  /**
   * El criterio de aceptación: sin `BILLING.READ`, Pagos no aparece en el menú. El grupo entero
   * desaparece porque sus dos entradas piden el mismo permiso, y un encabezado sin nada debajo
   * sólo informa de que existe algo a lo que no se llega.
   */
  it('esconde Pagos cuando el rol no puede leer facturación', () => {
    expect(
      visibleKeys({
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: ['DOCUMENT.READ_OWN', 'MEMBER.READ', 'ROLE.READ'],
      }),
    ).toEqual(['documents', 'settings', 'organization']);
  });

  it('muestra Documentos tanto con READ_OWN como con READ_ORGANIZATION', () => {
    for (const permission of [
      'DOCUMENT.READ_OWN',
      'DOCUMENT.READ_ORGANIZATION',
    ] as const) {
      expect(
        visibleKeys({
          accountType: 'PERSONAL',
          lockedWithoutPlan: false,
          permissions: [permission],
        }),
      ).toContain('documents');
    }
  });

  /**
   * Un miembro raso: puede con lo suyo y nada más. Documentos entra por `DOCUMENT.READ_OWN`;
   * Configuración se queda porque son los datos del propio usuario, que no dependen de ningún
   * permiso del catálogo.
   */
  it('a un miembro raso le deja Documentos y su configuración personal', () => {
    expect(
      visibleKeys({
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: ['DOCUMENT.CREATE', 'DOCUMENT.READ_OWN', 'DOCUMENT.SIGN_SELF'],
      }),
    ).toEqual(['documents', 'settings']);
  });

  /**
   * El instante del cambio de cuenta: los permisos viejos ya se descartaron y los nuevos no han
   * llegado. Todo lo que exija un permiso desaparece, que es lo que impide enseñar por un
   * momento el menú de la cuenta anterior.
   */
  it('sin permisos sólo quedan las entradas que no exigen ninguno', () => {
    expect(
      visibleKeys({
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: [],
      }),
    ).toEqual(['settings']);
  });
});
