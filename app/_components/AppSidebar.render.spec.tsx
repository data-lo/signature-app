import { render, screen, within } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import AppSidebar from './AppSidebar';

let mockPathname = '/dashboard/documents';
let mockPermissions: PermissionKey[] = [];

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/hooks/useLogout', () => ({
  useLogout: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/lib/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { firstName: 'Ana', lastName: 'López', email: 'ana@correo.mx' },
  }),
}));
jest.mock('@/lib/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      activeAccount: {
        id: 'acc-1',
        accountType: 'PERSONAL',
        organizationId: null,
      },
    }),
}));
jest.mock('@/lib/hooks/useOrganizationPlanAccess', () => ({
  useOrganizationPlanAccess: () => 'allowed',
}));
jest.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ authorization: { permissions: mockPermissions } }),
}));
jest.mock('./AccountSwitcher', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));

/** Los permisos de una cuenta personal (ver `AppSidebar.spec`). */
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

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

/** Contenedor del grupo (`SidebarGroup`) al que pertenece un rótulo de sección. */
function groupOf(label: string): HTMLElement {
  return screen
    .getByText(label)
    .closest('[data-slot="sidebar-group"]') as HTMLElement;
}

/**
 * Render del menú lateral: que "Gestión" aparezca como sección, con Documentos y Directorio
 * dentro, y que Pagos y Configuración sigan iguales. La lógica de filtrado se prueba en
 * `AppSidebar.spec.ts`; aquí se fija lo que el usuario ve.
 */
describe('AppSidebar — sección Gestión', () => {
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

  beforeEach(() => {
    mockPathname = '/dashboard/documents';
    mockPermissions = PERSONAL_PERMISSIONS;
  });

  it('muestra el rótulo "Gestión" con Documentos y Directorio agrupados debajo', () => {
    renderSidebar();

    const management = groupOf('Gestión');
    const links = within(management).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Documentos',
      'Directorio',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard/documents',
      '/dashboard/directory',
    ]);
  });

  it('las secciones salen en el orden Gestión, Pagos, Configuración, con las mismas entradas de siempre', () => {
    renderSidebar();

    const labels = screen
      .getAllByText(/^(Gestión|Pagos|Configuración)$/)
      .map((element) => element.textContent);
    expect(labels).toEqual(['Gestión', 'Pagos', 'Configuración']);

    expect(
      within(groupOf('Pagos'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Planes', 'Suscripciones']);
    expect(
      within(groupOf('Configuración'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Información personal', 'Identidad y firma']);
  });

  it.each([
    ['/dashboard/documents', 'Documentos'],
    ['/dashboard/documents/doc-1', 'Documentos'],
    ['/dashboard/documents/create', 'Documentos'],
    ['/dashboard/directory', 'Directorio'],
  ])('en %s marca activa sólo la entrada %s', (pathname, active) => {
    mockPathname = pathname;
    renderSidebar();

    const links = within(groupOf('Gestión')).getAllByRole('link');
    const activeLinks = links
      // Base UI marca el estado activo con el atributo `data-active` (vacío), no con un valor.
      .filter((link) => link.hasAttribute('data-active'))
      .map((link) => link.textContent);
    expect(activeLinks).toEqual([active]);
  });

  it('sin DIRECTORY.READ, Gestión queda sólo con Documentos', () => {
    mockPermissions = ['DOCUMENT.READ_OWN'];
    renderSidebar();

    expect(
      within(groupOf('Gestión'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Documentos']);
  });

  it('si no ve ni Documentos ni Directorio, no pinta un rótulo "Gestión" vacío', () => {
    mockPermissions = ['BILLING.READ'];
    renderSidebar();

    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.getByText('Pagos')).toBeInTheDocument();
  });
});
