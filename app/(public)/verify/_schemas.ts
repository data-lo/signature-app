import { z } from 'zod';

/**
 * Estados que devuelve la verificación pública de un archivo.
 *
 * - `VALID`: el archivo corresponde a un documento y su evidencia es verificable.
 * - `INVALID`: no se pudo comprobar la integridad del archivo.
 * - `NOT_FOUND`: no hay evidencia registrada para el archivo.
 * - `PENDING`: el documento existe, pero su evidencia o sellado sigue pendiente.
 * - `ERROR`: el archivo no tiene un formato válido o no se pudo procesar.
 */
export const VERIFICATION_STATUSES = [
  'VALID',
  'INVALID',
  'NOT_FOUND',
  'PENDING',
  'ERROR',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Tipo de archivo que identificó el backend. */
export const VERIFIED_FILE_TYPES = ['AUDIT_XML', 'FINAL_PDF'] as const;

/**
 * Respuesta de `POST /api/v1/document/public/verify` (dentro de `data`).
 *
 * Todo lo que no es `status` es opcional y anulable: según el estado, el backend puede no tener
 * documento vinculado ni evidencia que mostrar, y la pantalla oculta lo que no llega en vez de
 * pintarlo vacío (ver `InfoRow`).
 */
export const documentVerificationResultSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  fileType: z.enum(VERIFIED_FILE_TYPES).nullish(),
  /** Detalle del backend para el estado (p. ej. por qué no se pudo comprobar). */
  message: z.string().nullish(),
  document: z
    .object({
      id: z.string(),
      fileName: z.string().nullish(),
      status: z.string().nullish(),
      /** ISO 8601 en UTC. */
      signedAt: z.string().nullish(),
    })
    .nullish(),
  evidence: z
    .object({
      /** SHA-256 hex del XML de auditoría (`document_seals.verification_record_digest`). */
      verificationRecordDigest: z.string().nullish(),
      /** SHA-256 hex del PDF firmado. */
      signedHash: z.string().nullish(),
      /** ISO 8601 en UTC: cuándo el PSC emitió la constancia. */
      sealedAt: z.string().nullish(),
    })
    .nullish(),
});

export type DocumentVerificationResult = z.infer<
  typeof documentVerificationResultSchema
>;

/**
 * Tope de tamaño del archivo: 50 MiB. El XML de auditoría lleva dentro los tres PDFs y las
 * imágenes de los firmantes en Base64, así que pesa bastante más que el PDF final.
 */
export const MAX_VERIFICATION_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Tipos MIME aceptados. Los navegadores reportan un `.xml` como `text/xml` o `application/xml`
 * según el sistema operativo, así que se aceptan los dos.
 */
export const ACCEPTED_VERIFICATION_MIME_TYPES = [
  'application/xml',
  'text/xml',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = ['.xml', '.pdf'];

/**
 * Archivo a verificar: un único XML de auditoría o PDF final.
 *
 * Se valida por extensión Y por tipo MIME (si el navegador lo reporta): FilePond ya filtra por
 * tipo, pero esta es la regla que habilita el botón, y no debe depender de un widget de terceros.
 * Un tipo vacío se tolera porque algunos sistemas no asignan MIME a `.xml`; la extensión manda.
 */
export const verificationFileSchema = z
  .instanceof(File, { message: 'Selecciona un archivo XML o PDF.' })
  .refine(
    (file) => {
      const name = file.name.toLowerCase();
      const hasValidExtension = ACCEPTED_EXTENSIONS.some((extension) =>
        name.endsWith(extension),
      );
      const hasValidType =
        file.type === '' ||
        ACCEPTED_VERIFICATION_MIME_TYPES.includes(file.type);
      return hasValidExtension && hasValidType;
    },
    {
      message: 'Sólo se aceptan archivos XML de auditoría (.xml) o PDF (.pdf).',
    },
  )
  .refine((file) => file.size > 0, { message: 'El archivo está vacío.' })
  .refine((file) => file.size <= MAX_VERIFICATION_FILE_SIZE, {
    message: 'El archivo debe pesar menos de 50 MB.',
  });

/**
 * Valida el archivo seleccionado.
 *
 * @param file - Archivo elegido, o `null` si se quitó.
 * @returns `null` si es válido; si no, el mensaje para mostrar. Sin archivo no hay mensaje.
 *
 * @example
 * ```ts
 * validateVerificationFile(new File(['x'], 'a.docx')); // 'Sólo se aceptan archivos XML…'
 * ```
 */
export function validateVerificationFile(file: File | null): string | null {
  if (!file) return null;
  const result = verificationFileSchema.safeParse(file);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
