import type { RolePermission } from '@/lib/api/roles';

export interface OrganizationMemberRole {
  id: string;
  name: string;
}

/** Espeja `ACCOUNT_STATUS_ENUM` del backend. */
export type OrganizationMemberStatus =
  'pending_invite' | 'active' | 'suspended' | 'removed';

export interface OrganizationMember {
  accountId: string;
  userId: string;
  email: string;
  rfc: string | null;
  role: OrganizationMemberRole | null;
  joinedAt: string | null;
  status: OrganizationMemberStatus;
  isActive: boolean;
  /**
   * Permisos que el miembro tiene HOY por su rol. Son informativos: la aplicación efectiva del
   * RBAC en documentos, firmas y aprobaciones es una historia posterior.
   */
  permissions: RolePermission[];
}

export interface AddOrganizationMemberValues {
  email: string;
  roleId: string;
  position?: string;
}

/*
  Este módulo quedó siendo sólo los tipos.

  Las funciones que pedían y modificaban miembros desde el navegador (`getOrganizationMembers`,
  `addOrganizationMember`, `updateMemberRole`, `removeMember`) se fueron con la migración de la
  pantalla a renderizado en el servidor: ahora esas llamadas salen del servidor de Next, con la
  cookie de sesión, desde `app/server-actions/organizations/`. Los tipos se quedan porque los usan
  tanto los Server Actions como los componentes cliente que reciben los datos ya resueltos.
*/
