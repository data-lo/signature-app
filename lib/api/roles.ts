import apiClient from '@/lib/axios';

/**
 * Un permiso estático tal como lo publica el backend: la clave y la descripción se derivan de
 * recurso + acción + alcance, no son columnas (ver `permission-catalog.util.ts` en el servidor).
 */
export interface RolePermission {
  id: string;
  key: string;
  resource: string;
  action: string;
  scope: string;
  description: string;
  /** `false` para la rejilla CRUD heredada del seed de roles, que no es una capacidad de negocio. */
  isStaticCatalog: boolean;
}

export interface RoleData {
  id: string;
  name: string;
  isSystemRole: boolean;
  /** Permisos que otorga el rol. Es lo que la pantalla de miembros muestra antes de asignarlo. */
  permissions: RolePermission[];
}

export async function getSystemRolesRequest(): Promise<RoleData[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: RoleData[];
  }>('/api/v1/roles');

  return data.data;
}
