import type { Metadata } from 'next';

import { VerifyDocumentView } from './_components/VerifyDocumentView';

export const metadata: Metadata = {
  title: 'Verificar documento | Firmalo',
  description:
    'Comprueba si un XML de auditoría o un PDF final corresponde a un documento firmado en Firmalo.',
};

/**
 * `/verify`: consulta pública de verificación por archivo. No requiere sesión (ver
 * `PUBLIC_ROUTES` en `middleware.ts`).
 */
export default function VerifyDocumentPage() {
  return <VerifyDocumentView />;
}
