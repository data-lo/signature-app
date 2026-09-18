/**
 * Capacidades de negocio del catálogo estático del backend
 * (`src/roles/static-permission-catalog.ts` en signature-server).
 *
 * Son capacidades, no pantallas: `BILLING.MANAGE` es "puede administrar el plan", no "puede ver
 * el botón de administrar plan". Ninguna clave nombra una ruta, un componente ni un elemento de
 * menú — qué se enseña con cada una se decide en `navigation-permissions.ts` y en los
 * componentes, que es donde vive lo visual.
 *
 * **Esta unión duplica el enum del backend a mano.** Hoy no hay un paquete compartido entre los
 * dos repos, así que la alternativa sería generarla desde el Swagger en tiempo de build, que es
 * un paso de tooling que este ticket no monta. El riesgo está acotado: el backend sólo publica
 * claves del catálogo estático (ver `GetAuthorizationContextUseCase`), y una clave nueva que no
 * esté aquí llega como un permiso más que el frontend simplemente ignora — nunca como un
 * permiso de más.
 */
export type PermissionKey =
  | 'ORGANIZATION.READ'
  | 'ORGANIZATION.UPDATE'
  | 'BILLING.READ'
  | 'BILLING.MANAGE'
  | 'MEMBER.READ'
  | 'MEMBER.INVITE'
  | 'MEMBER.UPDATE'
  | 'MEMBER.REMOVE'
  | 'ROLE.READ'
  | 'ROLE.MANAGE'
  | 'DOCUMENT.CREATE'
  | 'DOCUMENT.READ_OWN'
  | 'DOCUMENT.READ_ORGANIZATION'
  | 'DOCUMENT.SEND_SIGNATURE_REQUEST'
  | 'DOCUMENT.SIGN_SELF'
  | 'DOCUMENT.APPROVE'
  | 'DOCUMENT.CANCEL';

/**
 * Lo que la cuenta activa puede hacer, tal como lo resuelve el backend en
 * `GET /api/v1/authorization/context`.
 *
 * Se obtiene UNA vez por render del dashboard, en el servidor, y vive en memoria en el cliente.
 * No se guarda en `localStorage` ni en ninguna cookie legible por JavaScript: no porque sea
 * secreto —el usuario puede leer sus propios permisos— sino porque persistirlo crea una segunda
 * verdad que sobrevive al cambio de rol, al cambio de cuenta y al cierre de sesión, y que
 * cualquiera puede editar para que la interfaz le ofrezca acciones que el backend va a rechazar.
 */
export interface AuthorizationContext {
  accountId: string;
  accountType: 'PERSONAL' | 'ORGANIZATION';
  organizationId: string | null;
  roleId: string | null;
  permissions: PermissionKey[];
}

/**
 * Una entrada del menú y los permisos con los que se gana su sitio.
 *
 * `anyPermissions` y no `allPermissions`: una entrada se muestra cuando el usuario puede hacer
 * ALGO dentro de ella. Documentos, por ejemplo, sirve tanto a quien sólo ve los suyos como a
 * quien ve los de toda la organización.
 */
export interface NavigationItem {
  label: string;
  href: string;
  anyPermissions: readonly PermissionKey[];
}
