import { NAV_GROUPS, visibleNavGroups } from './AppSidebar';
import { DOCUMENTS_SECTIONS } from '@/app/dashboard/documents/_config/sections';

/**
 * Claves de los grupos visibles, para comparar sin depender de rótulos ni iconos.
 *
 * @param options - Tipo de cuenta activa y si está bloqueada por no tener plan.
 * @returns Las claves de los grupos visibles, en orden.
 *
 * @example
 * visibleKeys({ accountType: 'PERSONAL', lockedWithoutPlan: false }); // ['documents', 'payments', 'settings']
 */
function visibleKeys(options: Parameters<typeof visibleNavGroups>[1]) {
  return visibleNavGroups(NAV_GROUPS, options).map((group) => group.key);
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

  /** Sólo Planes y Suscripciones: el resto la guarda lo mandaría de vuelta a Planes. */
  it('a una organización sin plan sólo le muestra Pagos', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: true }),
    ).toEqual(['payments']);
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
