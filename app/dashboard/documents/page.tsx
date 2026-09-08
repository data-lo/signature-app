import { Suspense } from 'react';
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
 */
export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsView />
    </Suspense>
  );
}
