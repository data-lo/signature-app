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

describe('AppSidebar — marca', () => {
  beforeAll(() => {
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

  /**
   * Monta el menú expandido o contraído.
   *
   * @param open - `false` para la barra contraída (modo ícono).
   * @returns El resultado del render.
   *
   * @example
   * renderSidebarIn(false);
   */
  function renderSidebarIn(open: boolean) {
    return render(
      <SidebarProvider defaultOpen={open}>
        <AppSidebar />
      </SidebarProvider>,
    );
  }

  /** El enlace de inicio de la cabecera, por su nombre accesible. */
  function brandLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Firmalo' });
  }

  it.each([
    ['expandida', true],
    ['contraída', false],
  ])('%s usa el isotipo de Login, decorativo', (_, open) => {
    renderSidebarIn(open);

    // `alt=""` le da rol `presentation`: no aparece como `img` en el árbol accesible.
    const image = brandLink().querySelector('img') as HTMLImageElement;
    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toContain('isotipo-firmalo.svg');
    expect(image).toHaveAttribute('alt', '');
  });

  it('expandida muestra el isotipo y el texto "Firmalo"', () => {
    renderSidebarIn(true);

    expect(within(brandLink()).getByText('Firmalo')).toBeInTheDocument();
    expect(within(brandLink()).getByTestId('brand-mark')).toBeInTheDocument();
  });

  /**
   * jsdom no evalúa las variantes de Tailwind, así que se fija el contrato: el texto se oculta
   * con `display: none` en modo ícono (no sólo recortado) y el enlace conserva su nombre.
   */
  it('contraída oculta el texto sin perder el nombre accesible', () => {
    const { container } = renderSidebarIn(false);

    expect(
      container.querySelector('[data-collapsible="icon"]'),
    ).toBeInTheDocument();
    expect(within(brandLink()).getByText('Firmalo')).toHaveClass(
      'group-data-[collapsible=icon]:hidden',
    );
    expect(brandLink()).toHaveAccessibleName('Firmalo');
  });

  it('sigue llevando al listado de documentos', () => {
    renderSidebarIn(false);

    expect(brandLink()).toHaveAttribute('href', '/dashboard/documents');
  });
});
