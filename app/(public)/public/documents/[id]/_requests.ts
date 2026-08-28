import apiClient from '@/lib/axios';
import { DocumentStatus, SignatureType } from '@/lib/enums/document';

/**
 * Constancia de conservación NOM-151 emitida por el PSC. Los mismos tres renglones que imprime la
 * hoja de evidencia anexada al PDF.
 *
 * `tsaCertificate` y `serialNumber` llegan HOY SIEMPRE en null, y no es un olvido: los dos viajan
 * dentro del token RFC 3161 y ni el PSC ni Seal Service los exponen por separado (ver
 * `toConservationRecord` en signature-server). La vista oculta el renglón cuando viene vacío en
 * vez de pintarlo sin valor.
 */
export interface PublicConservationRecord {
  tsaCertificate: string | null;
  serialNumber: string | null;
  /** ISO 8601 en UTC — la pantalla lo formatea a la zona horaria de quien consulta. */
  issuedAt: string | null;
}

/**
 * Evidencia pública de UNA firma. Los campos que no aplican al tipo de firma llegan en `null`, que
 * es lo que permite ocultar el renglón entero: los campos exclusivos de un tipo nunca se muestran
 * para el otro.
 *
 * No incluye la geolocalización (historia "Ocultar geolocalización en hojas de firma y vistas
 * públicas"): el backend dejó de publicar la ubicación desde la que firmó cada participante — ni
 * acá, ni en la hoja de firmas del PDF, ni en el contenido del QR. El dato se sigue capturando y
 * guardando como evidencia; lo que desapareció es su publicación.
 */
export interface PublicSigner {
  id: string;
  name: string;
  /** null mientras el documento sigue pendiente: ahí solo se publica el nombre. */
  signatureType: SignatureType | null;
  /** Rótulo del mecanismo ("Digital Simple" / "Firma Electronica Avanzada"). */
  signatureTypeLabel: string;
  /**
   * Fundamento legal de la firma. Lo sirve el backend —y no lo escribe esta pantalla— para que la
   * vista pública y la hoja de firmas impresa en el PDF no puedan divergir en el texto legal.
   */
  legalBacking: string;
  ipAddress: string;
  signedAt: string | null;
  /** Solo firma simple. */
  otpCode: string | null;
  /** Solo firma avanzada. */
  certificateSerialNumber: string | null;
  /** Solo firma avanzada. Base64 de varios cientos de caracteres. */
  electronicSignature: string | null;
}

/** Qué artefactos del sello del PSC se pueden descargar. Todos en false si no hay constancia. */
export interface PublicSealDownloads {
  nom151: boolean;
  timestamp: boolean;
  canonical: boolean;
}

/**
 * Evidencia cruda del sellado, en Base64: el DER/ASN.1 tal cual lo emitió el PSC, no el PDF de la
 * constancia. La pantalla la decodifica en el navegador para descargarla (ver
 * `downloadBase64Evidence`) — por eso viaja el contenido y no solo un booleano como en
 * `PublicSealDownloads`. `null` cuando el documento no tiene esa evidencia.
 */
export interface PublicSealEvidence {
  timestampFileBase64: string | null;
  integrityFileBase64: string | null;
}

/**
 * Serie y fecha de emisión (`notBefore`) del certificado TSA embebido en la evidencia NOM-151
 * (`integrityFileBase64`), extraídos de su ASN.1. `null` cuando no se pudieron extraer — la
 * pantalla no muestra el componente de certificado en ese caso, nunca uno de los dos campos suelto.
 */
export interface PublicIntegrityTsaCertificate {
  serialNumber: string;
  /** ISO 8601 en UTC. */
  issuedAt: string;
}

/**
 * Vista pública de verificación de un documento (`GET /document/public/:id`, sin autenticación).
 *
 * `isCompleted` es el interruptor de toda la pantalla (ver historia "Actualizar vista pública de
 * verificación de documentos según estado y tipo de firma"): mientras el documento siga pendiente
 * el backend solo manda el nombre del documento y los nombres de los firmantes, y todo lo demás
 * viene en null a propósito.
 */
export interface PublicDocumentView {
  id: string;
  fileName: string;
  status: DocumentStatus;
  isCompleted: boolean;
  /** Solo viene resuelta cuando el documento está completado. */
  secureUrl: string | null;
  expiresIn: number | null;
  hash: string | null;
  totalPages: number | null;
  /** Quién creó el documento — el mismo dato que imprime la hoja de evidencia. */
  createdBy: string | null;
  conservationRecord: PublicConservationRecord | null;
  signers: PublicSigner[];
  downloads: PublicSealDownloads;
  sealEvidence: PublicSealEvidence;
  integrityTsaCertificate: PublicIntegrityTsaCertificate | null;
}

export async function getPublicDocumentRequest(
  documentId: string,
): Promise<PublicDocumentView> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: PublicDocumentView;
  }>(`/document/public/${documentId}`);

  return data.data;
}

/** Artefactos descargables del sello, con el mismo nombre que usa la URL del backend. */
export type SealArtifact = keyof PublicSealDownloads;

/**
 * URL de descarga de un artefacto del sello.
 *
 * Es un enlace directo al backend (a través del proxy `/api` de Next, ver `next.config.ts`) y no
 * una petición por axios: el archivo llega con `Content-Disposition: attachment`, así que el
 * navegador lo guarda solo. Bajarlo por JS obligaría a construir un blob y un enlace temporal
 * para conseguir exactamente lo mismo, y la ruta es pública — no necesita el token que agrega el
 * interceptor de axios.
 */
export function sealArtifactDownloadUrl(
  documentId: string,
  artifact: SealArtifact,
): string {
  return `/api/document/public/${documentId}/seal/${artifact}`;
}
