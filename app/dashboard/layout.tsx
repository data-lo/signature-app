import { redirect } from 'next/navigation';

import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import { getAuthorizationContext } from '@/lib/authorization/get-authorization-context.server';

import ActiveAccountBridge from './_components/ActiveAccountBridge';
import AuthorizationUnavailableView from './_components/AuthorizationUnavailableView';
import DashboardShell from './_components/DashboardShell';

/**
 * Entrada del dashboard, en el servidor.
 *
 * Aquí se resuelve la autorización una sola vez por render: se lee la cuenta activa de su cookie
 * `HttpOnly`, se le piden al backend los permisos efectivos de esa cuenta y se hidratan en el
 * `PermissionProvider`. De ahí salen el menú y las acciones que verá el usuario, ya filtrados en
 * el HTML inicial — sin el parpadeo de pintar el menú completo y recortarlo después de hidratar.
 *
 * **No pasa por una Server Action.** Esto es una lectura del render inicial, no una mutación
 * disparada por el usuario: llamar al backend directamente es más directo y, sobre todo, ocurre
 * ANTES de mandar HTML, que es la única forma de que el primer byte ya venga filtrado.
 *
 * **Y no autoriza nada.** Cada pantalla vuelve a exigir su permiso con `assertPagePermission`, y
 * cada endpoint lo vuelve a validar en el backend. Lo que se decide aquí es qué se dibuja.
 *
 * Las tres formas de fallar llevan a sitios distintos, porque significan cosas distintas:
 * sin sesión se vuelve a `/login`; sin backend se ofrece reintentar, que es recuperable; y sin
 * una cuenta usable se entra igual, con el menú vacío, para que el selector de cuentas siga a
 * mano y el usuario pueda elegir otra.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getAuthorizationContext();

  if (!result.ok && result.failure === 'UNAUTHENTICATED') {
    redirect('/login');
  }

  if (!result.ok && result.failure === 'UNREACHABLE') {
    return <AuthorizationUnavailableView />;
  }

  const context = result.ok ? result.context : null;
  const needsCookiePersisted = result.ok ? !result.resolvedFromCookie : false;

  return (
    <PermissionProvider initialContext={context}>
      <ActiveAccountBridge
        context={context}
        needsCookiePersisted={needsCookiePersisted}
      />
      <DashboardShell>{children}</DashboardShell>
    </PermissionProvider>
  );
}
