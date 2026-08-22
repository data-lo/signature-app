'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLongDateTime } from '@/lib/format-datetime';
import { DocumentStatus } from '@/lib/enums/document';
import { usePublicDocument } from '../_hooks/usePublicDocument';
import type { PublicDocumentView as PublicDocumentViewData } from '../_requests';
import { SealDownloads } from './SealDownloads';
import { SignerEvidenceCard } from './SignerEvidenceCard';
import {
  InfoRow,
  VerificationAlert,
  VerificationSection,
} from './VerificationLayout';

// react-pdf necesita el DOM (`DOMMatrix`), así que se carga solo en cliente igual que los demás
// visores del proyecto. Con un `import` estático, pdfjs se evaluaba durante el SSR de esta página
// —que ocurre aunque el componente sea 'use client'— y reventaba con `ReferenceError: DOMMatrix is
// not defined` ANTES de renderizar nada: la ruta devolvía 500 para cualquier documento, incluso
// para los estatus que ni siquiera llegan a montar el visor. Importa porque esta es la página a la
// que apunta el QR impreso en la hoja de firmas de cada documento firmado.
const PublicPdfViewer = dynamic(() => import('./PublicPdfViewer'), {
  ssr: false,
});

const PENDING_MESSAGE = 'Este documento aún no se ha completado de firmar.';
const COMPLETED_MESSAGE =
  'Este documento ha sido firmado por todos sus participantes.';

/**
 * Un documento rechazado, cancelado o expirado tampoco está completado, pero ya nunca lo va a
 * estar: decirle a quien consulta que "aún no se ha completado" lo dejaría esperando una firma que
 * no va a llegar. La historia solo define dos estados (pendiente y completado) y esta pantalla
 * sigue teniendo dos —el aviso de arriba es de tipo Warning en todos estos casos y el contenido es
 * el mismo—, pero el texto sí distingue lo que todavía puede pasar de lo que ya se cerró.
 */
const TERMINAL_STATUS_MESSAGES: Partial<Record<DocumentStatus, string>> = {
  [DocumentStatus.Rejected]:
    'Este documento no se completó de firmar: uno de los firmantes lo rechazó.',
  [DocumentStatus.Cancelled]:
    'Este documento no se completó de firmar: fue cancelado.',
  [DocumentStatus.Expired]:
    'Este documento no se completó de firmar: venció su fecha límite.',
};

function pendingMessage(status: DocumentStatus): string {
  return TERMINAL_STATUS_MESSAGES[status] ?? PENDING_MESSAGE;
}

interface PublicDocumentViewProps {
  documentId: string;
}

function StatusCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Contenedor de la pantalla: una columna que se lee igual en escritorio y en teléfono. */
function VerificationPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Información de verificación
        </h1>
        {children}
      </div>
    </div>
  );
}

/**
 * Documento todavía pendiente de firmas: aviso, nombre del documento y nombres de los firmantes.
 *
 * Nada más, y es deliberado (ver historia "Actualizar vista pública de verificación de documentos
 * según estado y tipo de firma"): mientras la firma no se completa no hay evidencia que constatar,
 * y esta URL no pide sesión. El backend tampoco manda el resto — aquí no se está ocultando algo
 * que sí haya llegado.
 */
function PendingVerification({ data }: { data: PublicDocumentViewData }) {
  return (
    <VerificationPage>
      <VerificationAlert variant="warning">
        {pendingMessage(data.status)}
      </VerificationAlert>

      <VerificationSection title="Documento">
        <div className="flex flex-col">
          <InfoRow label="Nombre del documento" value={data.fileName} />
        </div>
      </VerificationSection>

      <VerificationSection title="Firmantes requeridos">
        {data.signers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este documento no tiene firmantes registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.signers.map((signer) => (
              <li
                key={signer.id}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                {signer.name}
              </li>
            ))}
          </ul>
        )}
      </VerificationSection>
    </VerificationPage>
  );
}

/** Documento firmado por todos: las cinco secciones de la historia, más el documento en sí. */
function CompletedVerification({ data }: { data: PublicDocumentViewData }) {
  return (
    <VerificationPage>
      <VerificationAlert variant="success">
        {COMPLETED_MESSAGE}
      </VerificationAlert>

      <VerificationSection title="Información del documento">
        <div className="flex flex-col">
          <InfoRow label="ID" value={data.id} mono />
          <InfoRow label="Nombre del documento" value={data.fileName} />
          <InfoRow label="Hash" value={data.hash} mono />
          <InfoRow label="Número de páginas" value={data.totalPages} />
          <InfoRow label="Creado por" value={data.createdBy} />
        </div>
      </VerificationSection>

      <VerificationSection title="Constancia de conservación (NOM-151)">
        {data.conservationRecord ? (
          <div className="flex flex-col">
            {/* Certificado (TSA) y número de serie viajan dentro del token RFC 3161 y el PSC no
                los expone por separado, así que hoy llegan en null y su renglón no se pinta (ver
                `toConservationRecord` en signature-server). */}
            <InfoRow
              label="Certificado (TSA)"
              value={data.conservationRecord.tsaCertificate}
              mono
            />
            <InfoRow
              label="Número de serie"
              value={data.conservationRecord.serialNumber}
              mono
            />
            <InfoRow
              label="Fecha de emisión"
              value={
                data.conservationRecord.issuedAt
                  ? formatLongDateTime(data.conservationRecord.issuedAt)
                  : null
              }
            />
          </div>
        ) : (
          // Solo se sellan ante el PSC los documentos con firma avanzada, y el sellado es
          // best-effort: decirlo es más útil que dejar la sección vacía.
          <p className="text-sm text-muted-foreground">
            Este documento no cuenta con una constancia de conservación emitida
            por un PSC.
          </p>
        )}
      </VerificationSection>

      <VerificationSection
        title="Firmantes"
        description="La evidencia mostrada corresponde al tipo de firma de cada participante."
      >
        {data.signers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este documento no tiene firmantes registrados.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.signers.map((signer) => (
              <SignerEvidenceCard key={signer.id} signer={signer} />
            ))}
          </div>
        )}
      </VerificationSection>

      <VerificationSection title="Descargas disponibles">
        <SealDownloads documentId={data.id} downloads={data.downloads} />
      </VerificationSection>

      {/* El documento en sí sigue siendo lo que viene a ver quien escanea el QR impreso en la
          hoja de firmas (historia "Visualización pública de documentos firmados mediante MinIO").
          La historia de verificación no lo menciona, pero quitarlo dejaría al QR sin destino. */}
      {data.secureUrl && (
        <VerificationSection title="Documento firmado">
          <div className="h-[70vh] min-h-96 overflow-hidden rounded-lg border border-border">
            <PublicPdfViewer file={data.secureUrl} />
          </div>
        </VerificationSection>
      )}
    </VerificationPage>
  );
}

/**
 * Vista pública de verificación de un documento — el destino del código QR que se imprime en la
 * hoja de firmas, consultable sin sesión y sin cuenta.
 *
 * Qué se muestra depende ÚNICAMENTE de `isCompleted`, que resuelve el backend: la UI nunca decide
 * por su cuenta si hay evidencia que publicar, igual que nunca decidió por su cuenta si mostrar el
 * archivo (ver `GET /document/public/:id`, que filtra la respuesta según el estatus).
 */
export default function PublicDocumentView({
  documentId,
}: PublicDocumentViewProps) {
  const { data, isLoading, isError } = usePublicDocument(documentId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StatusCard
        title="Documento no encontrado"
        description="El enlace no es válido o el documento ya no existe."
      />
    );
  }

  return data.isCompleted ? (
    <CompletedVerification data={data} />
  ) : (
    <PendingVerification data={data} />
  );
}
