import { Suspense } from 'react';
import PublicDocumentView from './_components/PublicDocumentView';

interface PublicDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicDocumentPage({
  params,
}: PublicDocumentPageProps) {
  const { id } = await params;

  /**
   * El límite de Suspense no es decorativo: la vista lee el parámetro `firma` de la URL —con el
   * que el QR de una firma avanzada señala a su firmante— y Next exige que `useSearchParams()`
   * viva dentro de un Suspense, o la compilación falla al prerenderizar esta ruta.
   *
   * El respaldo se deja vacío a propósito: la vista ya dibuja su propio indicador de carga
   * mientras pide el documento, y un segundo indicador encima sólo haría parpadear la pantalla.
   */
  return (
    <Suspense fallback={null}>
      <PublicDocumentView documentId={id} />
    </Suspense>
  );
}
