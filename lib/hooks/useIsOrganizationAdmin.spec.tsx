import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsOrganizationAdmin } from './useIsOrganizationAdmin';
import { getSystemRolesRequest } from '@/lib/api/roles';
import type { RoleData } from '@/lib/api/roles';
import { useAuthStore } from '@/lib/store/useAuthStore';

jest.mock('@/lib/api/roles');

const mockedGetSystemRoles = getSystemRolesRequest as jest.Mock;

function buildRole(id: string, name: string): RoleData {
  return { id, name, isSystemRole: true, permissions: [] };
}

/** El catálogo que publica GET /api/v1/roles desde que existe el rol OWNER. */
const SYSTEM_ROLES: RoleData[] = [
  buildRole('role-owner', 'OWNER'),
  buildRole('role-admin', 'ADMIN'),
  buildRole('role-member', 'MEMBER'),
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActiveRole(roleId: string | null) {
  act(() => {
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId,
      },
    });
  });
}

describe('useIsOrganizationAdmin', () => {
  beforeEach(() => {
    mockedGetSystemRoles.mockReset();
    mockedGetSystemRoles.mockResolvedValue(SYSTEM_ROLES);
    useAuthStore.setState({ activeAccount: null });
  });

  /**
   * El creador de la cuenta nace con OWNER, no con ADMIN: si la pantalla sólo reconociera ADMIN,
   * el propietario se quedaría sin los controles de administración de su propia organización.
   */
  it('reconoce como administrador al propietario de la cuenta', async () => {
    setActiveRole('role-owner');

    const { result } = renderHook(() => useIsOrganizationAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });

  it('reconoce como administrador al ADMIN nombrado por el propietario', async () => {
    setActiveRole('role-admin');

    const { result } = renderHook(() => useIsOrganizationAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });

  it('no toma por administrador a un miembro raso', async () => {
    setActiveRole('role-member');

    const { result } = renderHook(() => useIsOrganizationAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('no afirma nada si la membresía no tiene rol vigente', async () => {
    setActiveRole(null);

    const { result } = renderHook(() => useIsOrganizationAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
});
