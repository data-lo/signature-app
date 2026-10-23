import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';

import { Can } from '@/components/authorization/Can';
import { getAuthorizationContext } from '@/lib/authorization/get-authorization-context.server';

import DashboardLayout from './layout';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  // La pantalla de reintento usa `router.refresh()` para repetir el render del servidor.
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock('@/lib/authorization/get-authorization-context.server', () => ({
  getAuthorizationContext: jest.fn(),
}));
/**
 * El armazón del dashboard arrastra la barra lateral, React Query y media docena de hooks de
 * sesión. Nada de eso participa en lo que se prueba aquí —qué contexto baja el layout y a dónde
 * manda cuando no puede resolverlo—, así que se reduce a lo único que importa: que renderice a
 * sus hijos.
 */
jest.mock('./_components/DashboardShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));
jest.mock('./_components/ActiveAccountBridge', () => ({
  __esModule: true,
  default: ({ needsCookiePersisted }: { needsCookiePersisted: boolean }) => (
    <span data-testid="persistir-cookie">{String(needsCookiePersisted)}</span>
  ),
}));

const mockedGetContext = getAuthorizationContext as jest.Mock;
const mockedRedirect = redirect as unknown as jest.Mock;

const BILLING_READER = {
  ok: true,
  resolvedFromCookie: true,
  context: {
    accountId: 'account-org',
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'role-1',
    permissions: ['DOCUMENT.READ_OWN', 'BILLING.READ'],
  },
};

/** Un hijo que sólo aparece con `BILLING.MANAGE`: sirve para mirar el HTML que sale del layout. */
function Pagina() {
  return (
    <>
      <p>Contenido de la página</p>
      <Can permission="BILLING.MANAGE">
        <button>Administrar plan</button>
      </Can>
      <Can permission="BILLING.READ">
        <button>Ver facturación</button>
      </Can>
    </>
  );
}

/** El layout es asíncrono: se resuelve primero y se renderiza el árbol que devuelve. */
async function renderLayout() {
  const tree = await DashboardLayout({ children: <Pagina /> });
  return render(tree);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardLayout', () => {
  it('carga los permisos de la cuenta activa y los hidrata para la página', async () => {
    mockedGetContext.mockResolvedValue(BILLING_READER);

    await renderLayout();

    expect(mockedGetContext).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver facturación' }),
    ).toBeInTheDocument();
  });

  /**
   * El criterio de la historia: el HTML inicial no trae lo que el usuario no puede hacer. No es
   * una comprobación de seguridad —el endpoint sigue siendo quien decide— sino de que el filtrado
   * ocurre ANTES de mandar la página, y no después de hidratar, que es lo que producía el
   * parpadeo de ver un botón y perderlo.
   */
  it('no incluye en el HTML inicial las acciones que el rol no puede ejercer', async () => {
    mockedGetContext.mockResolvedValue(BILLING_READER);

    const { container } = await renderLayout();

    expect(
      screen.queryByRole('button', { name: 'Administrar plan' }),
    ).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Administrar plan');
  });

  it('manda a /login cuando la sesión caducó', async () => {
    mockedGetContext.mockResolvedValue({
      ok: false,
      failure: 'UNAUTHENTICATED',
    });

    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  /**
   * Un backend caído no es una sesión inválida ni una falta de permisos: se ofrece reintentar, y
   * no se cierra la sesión de nadie por un fallo de red.
   */
  it('ofrece reintentar cuando no se pudo alcanzar el backend', async () => {
    mockedGetContext.mockResolvedValue({ ok: false, failure: 'UNREACHABLE' });

    await renderLayout();

    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  /**
   * Sin una cuenta usable se entra igual, con el menú y las acciones vacías: el selector de
   * cuentas vive dentro del armazón, y sacar al usuario de aquí lo dejaría sin forma de elegir
   * otra.
   */
  it('con una cuenta no disponible entra sin permisos, conservando el armazón', async () => {
    mockedGetContext.mockResolvedValue({
      ok: false,
      failure: 'ACCOUNT_UNAVAILABLE',
    });

    await renderLayout();

    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ver facturación' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Sólo cuando el servidor tuvo que deducir la cuenta: si vino de la cookie no hay nada que
   * confirmar, y pedirlo dispararía una revalidación del layout en cada carga.
   */
  it('pide confirmar la cookie sólo cuando la cuenta se dedujo', async () => {
    mockedGetContext.mockResolvedValue(BILLING_READER);
    const { unmount } = await renderLayout();
    expect(screen.getByTestId('persistir-cookie')).toHaveTextContent('false');
    unmount();

    mockedGetContext.mockResolvedValue({
      ...BILLING_READER,
      resolvedFromCookie: false,
    });
    await renderLayout();
    expect(screen.getByTestId('persistir-cookie')).toHaveTextContent('true');
  });
});
