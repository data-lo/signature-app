import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from './useSystemRoles';

/**
 * El store solo guarda `activeAccount.roleId` (UUID); para saber si equivale al rol de sistema
 * ADMIN hay que resolverlo contra el catálogo de GET /api/v1/roles (mismo catálogo que ya
 * consume el selector de InviteMemberModal). `isLoading` en true mientras no se puede afirmar
 * nada todavía — evita parpadear controles de administrador antes de tener la respuesta.
 */
export function useIsOrganizationAdmin() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { data: roles, isLoading } = useSystemRoles();

  const isAdmin =
    !!activeAccount?.roleId &&
    roles?.find((role) => role.id === activeAccount.roleId)?.name === 'ADMIN';

  return { isAdmin: !!isAdmin, isLoading };
}
