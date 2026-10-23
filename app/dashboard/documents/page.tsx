import { Suspense } from 'react';

import { assertPageAnyPermission } from '@/lib/authorization/assert-page-permission.server';
import { DASHBOARD_NAVIGATION } from '@/lib/authorization/navigation-permissions';
import DocumentsView from './_components/DocumentsView';

/**
 * `/dashboard/documents`: la única pantalla de documentos.
 *
 * Antes esta ruta no tenía contenido propio —sólo redirigía a "Por firmar" o a "Completados"
 * según un `?status=` heredado— porque "Documentos" era un agrupador y la lista vivía repartida
 * en tres rutas hermanas. Ahora la lista ES esta ruta, y las tres anteriores redirigen aquí (ver
 * `next.config.ts`) conservando su recorte en `?view=`.
 *
 * `Suspense` porque la vista lee `?view=` con `useSearchParams`: sin un límite de suspensión, esa
 * lectura obliga a Next a renderizar toda la ruta en el cliente y lo avisa como error de build.
 *
 * Basta con UNO de los dos permisos de lectura: a esta misma pantalla llega quien sólo ve sus
 * documentos (`DOCUMENT.READ_OWN`) y quien ve los de toda la organización
 * (`DOCUMENT.READ_ORGANIZATION`). Cuáles se listan lo decide el backend, no esta comprobación.
 */
export default async function DocumentsPage() {
  await assertPageAnyPermission(DASHBOARD_NAVIGATION.documents.anyPermissions);

  return (
    <Suspense>
      <DocumentsView />
    </Suspense>
  );
}
