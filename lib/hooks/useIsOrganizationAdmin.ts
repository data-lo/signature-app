import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from './useSystemRoles';

/**
 * Roles de sistema que permiten administrar la organización: el propietario, que recibe OWNER al
 * crear la cuenta, y el administrador que él nombre después. Los dos traen el catálogo completo
 * de permisos (ver `STATIC_ROLE_PERMISSION_MATRIX` en signature-server), así que la pantalla les
 * abre lo mismo.
 */
const ADMINISTRATOR_ROLE_NAMES = ['OWNER', 'ADMIN'];

/**
 * El store solo guarda `activeAccount.roleId` (UUID); para saber si equivale a un rol de sistema
 * que administre hay que resolverlo contra el catálogo de GET /api/v1/roles (mismo catálogo que
 * ya consume el selector de InviteMemberModal). `isLoading` en true mientras no se puede afirmar
 * nada todavía — evita parpadear controles de administrador antes de tener la respuesta.
 */
export function useIsOrganizationAdmin() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { data: roles, isLoading } = useSystemRoles();

  const roleName = activeAccount?.roleId
    ? roles?.find((role) => role.id === activeAccount.roleId)?.name
    : undefined;
  const isAdmin = !!roleName && ADMINISTRATOR_ROLE_NAMES.includes(roleName);

  return { isAdmin, isLoading };
}
