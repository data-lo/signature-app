import Link from 'next/link';

import { formatLongDateTime } from '@/lib/format-datetime';

import {
  InfoRow,
  VerificationAlert,
  VerificationSection,
} from '../../public/documents/[id]/_components/VerificationLayout';
import type {
  DocumentVerificationResult,
  VerificationStatus,
} from '../_schemas';

/** Aviso de cada estado: variante del `VerificationAlert`, título y explicación. */
const STATUS_COPY: Record<
  VerificationStatus,
  { variant: 'success' | 'warning' | 'error'; title: string; message: string }
> = {
  VALID: {
    variant: 'success',
    title: 'Documento verificado',
    message:
      'El archivo corresponde a un documento firmado en Firmalo y su evidencia es verificable.',
  },
  INVALID: {
    variant: 'error',
    title: 'No se pudo comprobar la integridad',
    message:
      'El archivo no coincide con la evidencia registrada: pudo haberse modificado después de firmarse.',
  },
  NOT_FOUND: {
    variant: 'warning',
    title: 'Sin evidencia registrada',
    message: 'No existe evidencia registrada en Firmalo para este archivo.',
  },
  PENDING: {
    variant: 'warning',
    title: 'Evidencia pendiente',
    message:
      'El documento existe, pero su evidencia o sellado todavía está en proceso. Vuelve a consultarlo más tarde.',
  },
  ERROR: {
    variant: 'error',
    title: 'No se pudo procesar el archivo',
    message:
      'El archivo no tiene un formato válido o no se pudo procesar. Verifica que sea el XML de auditoría o el PDF final que descargaste de Firmalo.',
  },
};

const FILE_TYPE_LABELS = {
  AUDIT_XML: 'XML de auditoría',
  FINAL_PDF: 'PDF final',
} as const;

/**
 * Resultado de la verificación, en la misma página: aviso del estado y, si llegaron, el documento
 * vinculado y la evidencia.
 *
 * El texto del aviso es nuestro y siempre el mismo por estado; el `message` del backend sólo se
 * agrega como detalle. Los renglones vacíos se ocultan (ver `InfoRow`).
 *
 * @param props.result - Respuesta del backend.
 * @returns Las tarjetas del resultado.
 *
 * @example
 * ```tsx
 * {result && <VerificationResult result={result} />}
 * ```
 */
export function VerificationResult({
  result,
}: {
  result: DocumentVerificationResult;
}) {
  const copy = STATUS_COPY[result.status];
  const { document, evidence } = result;
  const hasEvidence =
    !!evidence &&
    !!(
      evidence.verificationRecordDigest ||
      evidence.signedHash ||
      evidence.sealedAt
    );

  return (
    <section
      aria-label="Resultado de la verificación"
      data-status={result.status}
      className="flex flex-col gap-4"
    >
      <VerificationAlert variant={copy.variant}>
        <span className="block font-medium">{copy.title}</span>
        <span className="block">{copy.message}</span>
        {result.message && (
          <span className="mt-1 block opacity-90">{result.message}</span>
        )}
      </VerificationAlert>

      {document && (
        <VerificationSection title="Documento vinculado">
          <div className="flex flex-col">
            <InfoRow label="Nombre del documento" value={document.fileName} />
            <InfoRow
              label="Archivo analizado"
              value={result.fileType ? FILE_TYPE_LABELS[result.fileType] : null}
            />
            <InfoRow
              label="Firmado el"
              value={
                document.signedAt ? formatLongDateTime(document.signedAt) : null
              }
            />
            <InfoRow label="Identificador" value={document.id} mono />
          </div>
          <Link
            href={`/public/documents/${document.id}`}
            className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver la información pública del documento
          </Link>
        </VerificationSection>
      )}

      {hasEvidence && (
        <VerificationSection
          title="Evidencia disponible"
          description="Huellas registradas al completar el sellado del documento."
        >
          <div className="flex flex-col">
            <InfoRow
              label="Huella del XML de auditoría (SHA-256)"
              value={evidence.verificationRecordDigest}
              mono
            />
            <InfoRow
              label="Huella del PDF firmado (SHA-256)"
              value={evidence.signedHash}
              mono
            />
            <InfoRow
              label="Constancia emitida"
              value={
                evidence.sealedAt ? formatLongDateTime(evidence.sealedAt) : null
              }
            />
          </div>
        </VerificationSection>
      )}
    </section>
  );
}
