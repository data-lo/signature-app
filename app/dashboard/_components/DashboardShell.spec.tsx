import { render, screen } from '@testing-library/react';
import DashboardShell from './DashboardShell';

jest.mock('../../_components/AppSidebar', () => ({
  __esModule: true,
  default: () => <nav aria-label="Navegación principal" />,
}));
jest.mock('./AuthProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./DashboardBreadcrumbs', () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumbs" />,
}));
jest.mock('./OrganizationPlanGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Layout compartido del dashboard: la barra lateral no se mueve al desplazar el contenido.
 *
 * jsdom no calcula layout, así que aquí se fija el contrato de clases; el comportamiento (sin
 * desplazamiento horizontal de la página, sin contenido debajo de la barra, encabezado móvil
 * visible al bajar) se midió en Chromium con contenido corto y largo y la barra expandida y
 * contraída.
 */
describe('DashboardShell', () => {
  beforeAll(() => {
    // jsdom no implementa `matchMedia`; `useIsMobile` lo consulta al montar el sidebar.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  it('el contenido principal no puede ensancharse más que la ventana', () => {
    render(
      <DashboardShell>
        <p>Contenido</p>
      </DashboardShell>,
    );

    const inset = screen
      .getByText('Contenido')
      .closest('[data-slot="sidebar-inset"]');
    // Sin `min-w-0`, una tabla ancha estira el inset y la página entera se desplaza de lado,
    // pasando por debajo de la barra lateral fija.
    expect(inset).toHaveClass('min-w-0');
  });

  it('en móvil, el botón que abre el menú queda pegado arriba al desplazar', () => {
    render(
      <DashboardShell>
        <p>Contenido</p>
      </DashboardShell>,
    );

    const header = screen
      .getByRole('button', { name: 'Toggle Sidebar' })
      .closest('header');
    expect(header).toHaveClass('sticky', 'top-0', 'md:hidden', 'bg-background');
  });
});
