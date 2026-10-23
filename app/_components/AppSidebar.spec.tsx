import { BookUser } from 'lucide-react';
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
  'DIRECTORY.READ',
  'DIRECTORY.CREATE',
  'DIRECTORY.UPDATE',
  'DIRECTORY.DELETE',
];

/**
 * Claves de los grupos visibles, para comparar sin depender de rótulos ni iconos.
 *
 * @param options - Tipo de cuenta, bloqueo por plan y, si la prueba lo necesita, los permisos;
 *   por defecto se pasan todos, para que sólo decida lo que la prueba está mirando.
 * @returns Las claves de los grupos visibles, en orden.
 *
 * @example
 * visibleKeys({ accountType: 'PERSONAL', lockedWithoutPlan: false }); // ['management', 'payments', 'settings']
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

/**
 * Rótulos de las entradas visibles de un grupo, para comprobar entradas sueltas dentro de Gestión.
 *
 * @param groupKey - Grupo a inspeccionar.
 * @param options - Igual que en `visibleKeys`.
 * @returns Los rótulos visibles del grupo, en orden; vacío si el grupo no se pinta.
 *
 * @example
 * visibleItemLabels('management', { accountType: 'PERSONAL', lockedWithoutPlan: false }); // ['Documentos', 'Directorio']
 */
function visibleItemLabels(
  groupKey: string,
  options: Omit<Parameters<typeof visibleNavGroups>[1], 'permissions'> & {
    permissions?: readonly PermissionKey[];
  },
) {
  return (
    visibleNavGroups(NAV_GROUPS, { permissions: ALL_PERMISSIONS, ...options })
      .find((group) => group.key === groupKey)
      ?.items.map((item) => item.label) ?? []
  );
}

describe('visibleNavGroups', () => {
  it('a una cuenta personal le muestra todo menos la configuración de organización', () => {
    expect(
      visibleKeys({ accountType: 'PERSONAL', lockedWithoutPlan: false }),
    ).toEqual(['management', 'payments', 'settings']);
  });

  it('a una organización con plan le muestra también su configuración', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: false }),
    ).toEqual(['management', 'payments', 'settings', 'organization']);
  });

  /**
   * Sólo Pagos, que es donde contrata. Ni lo operativo —documentos y firmas— ni la
   * administración de la organización: la guarda mandaría las dos de vuelta a Planes, y una
   * entrada de menú que rebota es peor que no estar.
   *
   * Organización estuvo visible sin plan; esta prueba fija la regla nueva para que reponer
   * `availableWithoutPlan` en ese grupo no pase inadvertido.
   */
  it('a una organización sin plan sólo le muestra Pagos', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: true }),
    ).toEqual(['payments']);
  });

  /** Al activar el plan la sección vuelve: es el mismo menú, sin el recorte. */
  it('al contratar un plan, la organización recupera su sección', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: true }),
    ).not.toContain('organization');
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: false }),
    ).toContain('organization');
  });
});

/** El grupo Gestión, tal como lo declara el menú. */
const management = () =>
  NAV_GROUPS.find((group) => group.key === 'management')!;

describe('sección Gestión', () => {
  it('es el primer grupo, con el rótulo "Gestión", y agrupa Documentos y Directorio en ese orden', () => {
    expect(NAV_GROUPS[0]).toBe(management());
    expect(management().label).toBe('Gestión');
    expect(management().items.map((item) => item.label)).toEqual([
      'Documentos',
      'Directorio',
    ]);
  });

  /** Pagos y Configuración no cambian: mismos rótulos, mismas entradas, mismo orden relativo. */
  it('Pagos y Configuración conservan su estructura y su posición tras Gestión', () => {
    expect(
      NAV_GROUPS.map((group) => [
        group.key,
        group.label,
        group.items.map((item) => item.label),
      ]),
    ).toEqual([
      ['management', 'Gestión', ['Documentos', 'Directorio']],
      ['payments', 'Pagos', ['Planes', 'Suscripciones']],
      [
        'settings',
        'Configuración',
        ['Información personal', 'Identidad y firma'],
      ],
      [
        'organization',
        'Organización',
        [
          'Información de la organización',
          'Administrar miembros',
          'Roles y permisos',
        ],
      ],
    ]);
  });

  it('se esconde entero si el rol no ve ni Documentos ni Directorio', () => {
    expect(
      visibleKeys({
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: ['BILLING.READ'],
      }),
    ).toEqual(['payments', 'settings']);
  });
});

describe('entrada Documentos', () => {
  /**
   * El alta dejó de ser una entrada del menú: se llega a ella por el botón de la pantalla de
   * Documentos. Sin esta prueba, reponerla en `DOCUMENTS_NAV_SECTIONS` volvería a partir el
   * módulo en dos entradas hermanas sin que nada avisara.
   */
  it('deja una sola entrada del módulo, la del listado, con su icono', () => {
    const documentItems = management().items.filter((item) =>
      item.href.startsWith(DOCUMENTS_SECTIONS.list.href),
    );

    expect(documentItems).toHaveLength(1);
    expect(documentItems[0]).toMatchObject({
      label: DOCUMENTS_SECTIONS.list.label,
      href: DOCUMENTS_SECTIONS.list.href,
      icon: DOCUMENTS_SECTIONS.list.icon,
    });
  });

  /** El alta y el detalle son pantallas del módulo: la entrada sigue marcada estando en ellas. */
  it('marca la entrada como activa en las rutas hijas del módulo', () => {
    const isActive = management().items[0].isActive;

    expect(isActive(DOCUMENTS_SECTIONS.list.href)).toBe(true);
    expect(isActive(DOCUMENTS_SECTIONS.create.href)).toBe(true);
    expect(isActive('/dashboard/documents/doc-1')).toBe(true);
    expect(isActive('/dashboard/plans')).toBe(false);
    expect(isActive('/dashboard/directory')).toBe(false);
  });
});

describe('entrada Directorio', () => {
  /**
   * Los permisos con los que el backend resuelve una cuenta personal: todo lo que no exige
   * organización (ver `PERSONAL_ACCOUNT_PERMISSION_KEYS` en signature-server), con los cuatro
   * `DIRECTORY.*` incluidos.
   */
  const PERSONAL_PERMISSIONS: PermissionKey[] = [
    'BILLING.READ',
    'BILLING.MANAGE',
    'DOCUMENT.CREATE',
    'DOCUMENT.READ_OWN',
    'DOCUMENT.SIGN_SELF',
    'DIRECTORY.READ',
    'DIRECTORY.CREATE',
    'DIRECTORY.UPDATE',
    'DIRECTORY.DELETE',
  ];

  it('aparece bajo Gestión para una cuenta personal', () => {
    expect(
      visibleItemLabels('management', {
        accountType: 'PERSONAL',
        lockedWithoutPlan: false,
        permissions: PERSONAL_PERMISSIONS,
      }),
    ).toEqual(['Documentos', 'Directorio']);
  });

  it('en una organización sólo aparece con DIRECTORY.READ; Documentos sigue por su cuenta', () => {
    expect(
      visibleItemLabels('management', {
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: ['DOCUMENT.READ_OWN', 'DIRECTORY.READ'],
      }),
    ).toEqual(['Documentos', 'Directorio']);
    expect(
      visibleItemLabels('management', {
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: [
          'DOCUMENT.READ_OWN',
          'DIRECTORY.CREATE',
          'DIRECTORY.UPDATE',
          'DIRECTORY.DELETE',
        ],
      }),
    ).toEqual(['Documentos']);
  });

  it('sólo con DIRECTORY.READ, Gestión queda con Directorio', () => {
    expect(
      visibleItemLabels('management', {
        accountType: 'ORGANIZATION',
        lockedWithoutPlan: false,
        permissions: ['DIRECTORY.READ'],
      }),
    ).toEqual(['Directorio']);
  });

  it('lleva a /dashboard/directory con su icono y se marca activa en esa ruta', () => {
    const item = management().items[1];

    expect(item).toMatchObject({
      label: 'Directorio',
      href: '/dashboard/directory',
      icon: BookUser,
    });
    expect(item.isActive('/dashboard/directory')).toBe(true);
    expect(item.isActive('/dashboard/documents')).toBe(false);
  });
});

describe('grupo de organización', () => {
  /** Las entradas del grupo, en el orden en que se pintan. */
  function organizationLabels(permissions?: readonly PermissionKey[]) {
    return visibleNavGroups(NAV_GROUPS, {
      accountType: 'ORGANIZATION',
      lockedWithoutPlan: false,
      permissions: permissions ?? ALL_PERMISSIONS,
    })
      .find((group) => group.key === 'organization')!
      .items.map((item) => item.label);
  }

  /**
   * "Información de la organización" va primero: es la ficha de la organización, y las otras dos
   * son operaciones sobre ella.
   */
  it('abre con la información de la organización', () => {
    expect(organizationLabels()).toEqual([
      'Información de la organización',
      'Administrar miembros',
      'Roles y permisos',
    ]);
  });

  /** Pide el mismo permiso que el endpoint que la surte, ni más ni menos. */
  it('la información sólo aparece con ORGANIZATION.READ', () => {
    expect(organizationLabels(['ORGANIZATION.READ'])).toEqual([
      'Información de la organización',
    ]);
    expect(organizationLabels(['MEMBER.READ'])).not.toContain(
      'Información de la organización',
    );
  });

  it('marca la entrada como activa sólo en su propia ruta', () => {
    const isActive = NAV_GROUPS.find((group) => group.key === 'organization')!
      .items[0].isActive;

    expect(isActive('/dashboard/organization/settings/information')).toBe(true);
    expect(isActive('/dashboard/organization/settings/roles')).toBe(false);
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
    ).toEqual(['management', 'settings', 'organization']);
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
      ).toContain('management');
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
        permissions: [
          'DOCUMENT.CREATE',
          'DOCUMENT.READ_OWN',
          'DOCUMENT.SIGN_SELF',
        ],
      }),
    ).toEqual(['management', 'settings']);
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
