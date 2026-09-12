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

  /** Sólo Planes y Suscripciones: el resto la guarda lo mandaría de vuelta a Planes. */
  it('a una organización sin plan sólo le muestra Pagos', () => {
    expect(
      visibleKeys({ accountType: 'ORGANIZATION', lockedWithoutPlan: true }),
    ).toEqual(['payments']);
  });
});
