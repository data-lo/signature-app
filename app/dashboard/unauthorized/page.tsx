import { UnauthorizedView } from '@/components/authorization/UnauthorizedView';

/**
 * Destino de `assertPagePermission` cuando falta el permiso de una ruta.
 *
 * Vive DENTRO de `/dashboard` a propósito: quien llega aquí sigue teniendo sesión y sigue
 * teniendo cuenta, así que conserva el menú y puede irse a cualquier sección que sí le toque.
 * Sacarla del layout la convertiría en un callejón sin salida.
 */
export default function DashboardUnauthorizedPage() {
  return <UnauthorizedView />;
}
