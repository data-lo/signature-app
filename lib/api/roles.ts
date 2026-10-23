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

/*
  Aquí vivía `getSystemRolesRequest` (`GET /api/v1/roles`), el catálogo de roles DE SISTEMA. Ya
  no lo usa nadie: las dos pantallas que eligen rol —invitar miembro y editar rol— piden los
  roles de la organización (`lib/api/organization-roles.ts`), que trae los de sistema y además
  los propios de ella. Se quita en lugar de dejarlo a mano porque es la fuente equivocada: quien
  la use vuelve a ofrecer OWNER y a perder los roles personalizados, que es exactamente el
  defecto que se corrigió.
*/
