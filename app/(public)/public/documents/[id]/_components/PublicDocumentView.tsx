'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { nameInitials } from '@/lib/name-initials';
import { formatLongDateTime } from '@/lib/format-datetime';
import { DocumentStatus } from '@/lib/enums/document';
import { usePublicDocument } from '../_hooks/usePublicDocument';
import { useHighlightedSigner } from '../_hooks/useHighlightedSigner';
import type { PublicDocumentView as PublicDocumentViewData } from '../_requests';
import { AuditXmlDownload } from './AuditXmlDownload';
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

/** Textos de la pantalla de un documento con firmas pendientes. */
export const PENDING_DESCRIPTION =
  'Consulta el estado y los firmantes requeridos de este documento.';
export const PENDING_ALERT_TITLE = 'Firmas incompletas';
const PENDING_MESSAGE =
  'Este documento aún no cuenta con todas las firmas requeridas.';
const COMPLETED_MESSAGE =
  'Este documento ha sido firmado por todos sus participantes.';

/**
 * Un documento rechazado, cancelado o expirado tampoco está completado, pero ya nunca lo va a
 * estar: decirle a quien consulta que "aún no se ha completado" lo dejaría esperando una firma que
 * no va a llegar. La historia solo define dos estados (pendiente y completado) y esta pantalla
 * sigue teniendo dos —el aviso de arriba es de tipo Warning con el título "Firmas incompletas" en
 * todos estos casos y el contenido es el mismo—, pero el texto sí distingue lo que todavía puede
 * pasar de lo que ya se cerró.
 */
const TERMINAL_STATUS_MESSAGES: Partial<Record<DocumentStatus, string>> = {
  [DocumentStatus.Rejected]:
    'Este documento no se completó de firmar: uno de los firmantes lo rechazó.',
  [DocumentStatus.Cancelled]:
    'Este documento no se completó de firmar: fue cancelado.',
  [DocumentStatus.Expired]:
    'Este documento no se completó de firmar: venció su fecha límite.',
};

/**
 * Texto del aviso de un documento sin completar.
 *
 * @param status - Estatus del documento según el backend.
 * @returns El motivo si ya no se completará (rechazado, cancelado, expirado) o el texto de
 *   "firmas incompletas" si todavía puede completarse.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * pendingMessage(DocumentStatus.PendingSignature);
 * // 'Este documento aún no cuenta con todas las firmas requeridas.'
 * ```
 */
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

/**
 * Contenedor de la pantalla: una columna que se lee igual en escritorio y en teléfono.
 *
 * @param props.description - Texto de apoyo bajo el título. Opcional.
 * @param props.children - Aviso y secciones de la pantalla.
 * @returns La página con su título.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <VerificationPage description={PENDING_DESCRIPTION}>…</VerificationPage>
 * ```
 */
function VerificationPage({
  description,
  children,
}: {
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">
            Información de verificación
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Un firmante en la lista de firmantes requeridos: iniciales como apoyo visual y el nombre.
 *
 * Sólo eso. Mientras el documento está pendiente el backend publica el nombre de cada firmante y
 * nada más —ni si ya firmó—, así que la fila no lleva estatus individual: pintar "Pendiente" en
 * todas sería afirmar algo que la respuesta no dice.
 *
 * @param props.name - Nombre del firmante.
 * @param props.highlighted - Si es la firma que señala el QR escaneado.
 * @returns La fila (`li`) del firmante.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <RequiredSignerRow name="Isaay Sosa" highlighted={false} />
 * ```
 */
function RequiredSignerRow({
  name,
  highlighted,
}: {
  name: string;
  highlighted: boolean;
}) {
  const initials = nameInitials(name);

  return (
    <li
      data-highlighted={highlighted || undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground',
        highlighted &&
          'border-primary bg-primary/5 ring-2 ring-primary/40 dark:bg-primary/10',
      )}
    >
      {/* Decorativas: el nombre ya está al lado, y un lector de pantalla leería "I S, Isaay
        Sosa". Sin iniciales (nombre en blanco) el círculo no se pinta. */}
      {initials && (
        <span
          aria-hidden
          data-slot="signer-initials"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
        >
          {initials}
        </span>
      )}
      {/* `overflow-wrap:anywhere`: un nombre o correo sin espacios no debe ensanchar la fila en
        un teléfono. */}
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{name}</span>
    </li>
  );
}

/**
 * Documento todavía pendiente de firmas: aviso de firmas incompletas y una tarjeta con el nombre
 * del documento y los firmantes requeridos, en secciones separadas.
 *
 * Nada más, y es deliberado (ver historia "Actualizar vista pública de verificación de documentos
 * según estado y tipo de firma"): mientras la firma no se completa no hay evidencia que constatar,
 * y esta URL no pide sesión. El backend tampoco manda el resto — aquí no se está ocultando algo
 * que sí haya llegado.
 *
 * @param props.data - Respuesta pública del documento, con `isCompleted` en false.
 * @param props.highlightedSignerId - Firmante que señala el QR, o null.
 * @returns La pantalla de verificación pendiente.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <PendingVerification data={data} highlightedSignerId={null} />
 * ```
 */
function PendingVerification({
  data,
  highlightedSignerId,
}: {
  data: PublicDocumentViewData;
  highlightedSignerId: string | null;
}) {
  return (
    <VerificationPage description={PENDING_DESCRIPTION}>
      <VerificationAlert variant="warning" title={PENDING_ALERT_TITLE}>
        {pendingMessage(data.status)}
      </VerificationAlert>

      <Card data-slot="pending-verification-card">
        <CardContent className="flex flex-col">
          {/* Las dos secciones son encabezados reales (`h2`): se llega a esta pantalla desde el
            teléfono tras escanear un QR, y un lector de pantalla salta entre secciones por
            encabezados. "Documento" va como rótulo discreto porque lo que importa es el nombre. */}
          <section
            aria-labelledby="pending-document-heading"
            className="flex flex-col gap-1 pb-4"
          >
            <h2
              id="pending-document-heading"
              className="text-sm text-muted-foreground"
            >
              Documento
            </h2>
            {/* `overflow-wrap:anywhere`: los nombres de archivo suelen ser una sola "palabra"
              (`contrato_final_v3_firmado.pdf`) y con `break-words` no se cortarían. */}
            <p className="text-base font-medium text-foreground [overflow-wrap:anywhere]">
              {data.fileName}
            </p>
          </section>

          <section
            aria-labelledby="pending-signers-heading"
            className="flex flex-col gap-3 border-t border-border pt-4"
          >
            <h2
              id="pending-signers-heading"
              data-slot="card-title"
              className="font-heading text-base leading-snug font-medium"
            >
              Firmantes requeridos
            </h2>
            {data.signers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este documento no tiene firmantes registrados.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.signers.map((signer) => (
                  <RequiredSignerRow
                    key={signer.id}
                    name={signer.name}
                    highlighted={signer.id === highlightedSignerId}
                  />
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>
    </VerificationPage>
  );
}

/** Documento firmado por todos: las cinco secciones de la historia, más el documento en sí. */
function CompletedVerification({
  data,
  highlightedSignerId,
}: {
  data: PublicDocumentViewData;
  highlightedSignerId: string | null;
}) {
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
            {/* Mismas etiquetas que la tabla NOM-151 de la hoja de firmas anexada al PDF: es la
                misma constancia vista desde dos sitios, y rotularla distinto obliga a quien
                contrasta pantalla y documento a deducir que hablan del mismo renglón. */}
            <InfoRow
              label="Número de Serie"
              value={data.conservationRecord.serialNumber}
              mono
            />
            <InfoRow
              label="Emitido"
              value={
                data.conservationRecord.issuedAt
                  ? formatLongDateTime(data.conservationRecord.issuedAt)
                  : null
              }
            />
          </div>
        ) : data.sealingPending ? (
          /* La constancia está en camino: no se pudo emitir al firmar porque el servicio del SAT
             no respondió, y se emite en cuanto se pueda comprobar la revocación del certificado.
             Se distingue del caso "no le corresponde" para no dar por definitivo algo temporal. */
          <p className="text-sm text-muted-foreground">
            La constancia de conservación de este documento está pendiente de
            emitirse. El documento ya está firmado y es válido; su constancia se
            generará en cuanto el servicio del SAT vuelva a estar disponible.
          </p>
        ) : (
          // Solo se sellan ante el PSC los documentos con firma avanzada, y el sellado es
          // best-effort: decirlo es más útil que dejar la sección vacía.
          <p className="text-sm text-muted-foreground">
            Este documento no cuenta con una constancia de conservación emitida
            por un PSC.
          </p>
        )}

        {/* Serie y notBefore del certificado TSA embebido en la evidencia NOM-151
            (`integrityEvidence.fileBase64`), distinto del renglón "Certificado (TSA)" de arriba
            —ese vive dentro del sello de tiempo RFC 3161, que el backend todavía no extrae—. Solo
            se pinta cuando el backend logró extraer AMBOS datos: uno sin el otro no se muestra. */}
        {data.integrityTsaCertificate && (
          <div className="mt-3 flex flex-col border-t border-border pt-3">
            <InfoRow
              label="Serie del certificado (TSA)"
              value={data.integrityTsaCertificate.serialNumber}
              mono
            />
            <InfoRow
              label="Emisión del certificado (TSA)"
              value={formatLongDateTime(data.integrityTsaCertificate.issuedAt)}
            />
          </div>
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
              <SignerEvidenceCard
                key={signer.id}
                signer={signer}
                highlighted={signer.id === highlightedSignerId}
              />
            ))}
          </div>
        )}
      </VerificationSection>

      <VerificationSection title="Descargas disponibles">
        <div className="flex flex-col gap-4">
          {/* Primero el expediente completo y luego las piezas sueltas del sello: quien viene a
              auditar el documento se lleva todo en un archivo, y quien busca verificar una pieza
              concreta con sus propias herramientas la sigue teniendo suelta. */}
          <AuditXmlDownload documentId={data.id} />

          <SealDownloads
            documentId={data.id}
            downloads={data.downloads}
            sealEvidence={data.sealEvidence}
          />
        </div>
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

  /**
   * Firma señalada por el QR que se escaneó. Se resuelve contra los firmantes que el backend ya
   * publicó, así que un parámetro ausente, inválido o de otro documento simplemente no resalta
   * nada y la página carga como siempre (ver `useHighlightedSigner`).
   *
   * El hook va antes de los returns tempranos porque es un hook: React exige que se llame en el
   * mismo orden en cada render, y mientras carga `data` es `undefined` —el hook lo contempla—.
   */
  const highlightedSignerId = useHighlightedSigner(data?.signers);

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
    <CompletedVerification
      data={data}
      highlightedSignerId={highlightedSignerId}
    />
  ) : (
    <PendingVerification
      data={data}
      highlightedSignerId={highlightedSignerId}
    />
  );
}
