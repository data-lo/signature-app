'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { useOptionalSigningSession } from './SigningSessionProvider';
import SignaturePositionsLayer from './SignaturePositionsLayer';
import type { SignaturePosition } from './signing-session';

// react-pdf necesita el DOM: el visor sólo se carga en el cliente, igual que en la vista pública.
const PublicPdfViewer = dynamic(
  () => import('../public/documents/[id]/_components/PublicPdfViewer'),
  { ssr: false },
);

const NO_POSITIONS: SignaturePosition[] = [];

interface SigningDocumentWorkspaceProps {
  /** URL prefirmada del PDF, que el flujo obtuvo DESPUÉS de validar al firmante. */
  fileUrl: string;
  /** Panel lateral del flujo (estado de la firma, botones). */
  children: React.ReactNode;
}

/**
 * Visor del documento a firmar con su panel lateral: lo que repetían, idéntico, la firma biométrica
 * y la Firma Avanzada de invitado. Si hay `SigningSessionProvider` con posiciones del firmante, las
 * marca sobre cada página (`SignaturePositionsLayer`).
 *
 * No pide el PDF: lo recibe del flujo, que sólo lo tiene una vez que el backend validó al firmante
 * (código del correo). Así una invitación sin validar nunca muestra el documento.
 *
 * @param props.fileUrl - URL del PDF.
 * @param props.children - Panel lateral.
 * @returns El visor y el panel, en dos columnas en pantallas anchas.
 *
 * @example
 * ```tsx
 * <SigningDocumentWorkspace fileUrl={document.fileUrl}><Card>…</Card></SigningDocumentWorkspace>
 * ```
 */
export default function SigningDocumentWorkspace({
  fileUrl,
  children,
}: SigningDocumentWorkspaceProps) {
  const state = useOptionalSigningSession()?.state;
  const positions =
    state && 'positions' in state ? state.positions : NO_POSITIONS;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="h-[75vh] overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <PublicPdfViewer
            file={fileUrl}
            renderPageOverlay={
              positions.length > 0
                ? (pageNumber) => (
                    <SignaturePositionsLayer
                      positions={positions}
                      pageNumber={pageNumber}
                    />
                  )
                : undefined
            }
          />
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
