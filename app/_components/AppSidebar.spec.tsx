import { NAV_GROUPS, visibleNavGroups } from './AppSidebar';

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
