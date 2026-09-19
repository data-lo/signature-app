import {
  DASHBOARD_NAVIGATION,
  dashboardNavigation,
  visibleNavigation,
} from './navigation-permissions';

describe('catálogo de navegación', () => {
  /**
   * Los permisos describen capacidades de negocio, no pantallas. Si una clave del catálogo
   * mencionara una ruta o un componente, dejaría de poder compartirse con el backend — que es
   * quien las define.
   */
  it('sus permisos son claves del catálogo, nunca rutas ni etiquetas', () => {
    for (const item of dashboardNavigation) {
      for (const permission of item.anyPermissions) {
        expect(permission).toMatch(/^[A-Z]+\.[A-Z_]+$/);
        expect(permission).not.toContain('/');
      }
    }
  });

  it('toda sección declara al menos un permiso', () => {
    for (const item of dashboardNavigation) {
      expect(item.anyPermissions.length).toBeGreaterThan(0);
    }
  });
});

describe('visibleNavigation', () => {
  it('deja pasar la sección cuando se tiene uno de sus permisos', () => {
    expect(
      visibleNavigation(dashboardNavigation, ['DOCUMENT.READ_ORGANIZATION']),
    ).toEqual([DASHBOARD_NAVIGATION.documents]);
  });

  /** Criterio de la historia: los dos alcances de lectura habilitan la navegación de documentos. */
  it('READ_OWN y READ_ORGANIZATION habilitan la misma sección', () => {
    for (const permission of [
      'DOCUMENT.READ_OWN',
      'DOCUMENT.READ_ORGANIZATION',
    ] as const) {
      expect(visibleNavigation(dashboardNavigation, [permission])).toContain(
        DASHBOARD_NAVIGATION.documents,
      );
    }
  });

  it('BILLING.READ abre Planes y Suscripciones, y sin él no aparecen', () => {
    const conFacturacion = visibleNavigation(dashboardNavigation, [
      'BILLING.READ',
    ]);
    expect(conFacturacion).toEqual([
      DASHBOARD_NAVIGATION.plans,
      DASHBOARD_NAVIGATION.subscriptions,
    ]);

    expect(
      visibleNavigation(dashboardNavigation, ['DOCUMENT.READ_OWN']),
    ).not.toContain(DASHBOARD_NAVIGATION.plans);
  });

  /**
   * `BILLING.MANAGE` no arrastra a `BILLING.READ`: son dos capacidades distintas y el menú se
   * construye con la de lectura, que es la que abre la pantalla.
   */
  it('no deduce unos permisos a partir de otros', () => {
    expect(
      visibleNavigation(dashboardNavigation, ['BILLING.MANAGE']),
    ).toEqual([]);
  });

  it('sin permisos no queda ninguna sección', () => {
    expect(visibleNavigation(dashboardNavigation, [])).toEqual([]);
  });
});
