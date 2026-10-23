'use client';

interface DocumentUploadProgressProps {
  /** Porcentaje subido (0–100). */
  percent: number;
}

/**
 * Texto del estado del envío según cuánto del documento se ha subido.
 *
 * Al llegar a 100 la subida terminó pero el envío no: el servidor todavía valida, guarda y
 * registra el documento. Decir "Procesando" en esa fase evita que un 100% inmóvil parezca un
 * cuelgue.
 *
 * @param percent - Porcentaje subido (0–100).
 * @returns El texto para el botón y el lector de pantalla.
 *
 * @example
 * ```ts
 * uploadStatusLabel(40);  // 'Subiendo documento... 40%'
 * uploadStatusLabel(100); // 'Procesando documento...'
 * ```
 */
export function uploadStatusLabel(percent: number): string {
  return percent >= 100
    ? 'Procesando documento...'
    : `Subiendo documento... ${percent}%`;
}

/**
 * Barra de avance del envío del documento, bajo el botón de envío.
 *
 * @param props.percent - Porcentaje subido (0–100).
 * @returns La barra con su rol de `progressbar`, para lectores de pantalla y pruebas.
 *
 * @example
 * ```tsx
 * <DocumentUploadProgress percent={uploadProgress} />
 * ```
 */
export default function DocumentUploadProgress({
  percent,
}: DocumentUploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      role="progressbar"
      aria-label="Avance del envío del documento"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={uploadStatusLabel(clamped)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={
          clamped >= 100
            ? 'h-full w-full animate-pulse bg-primary'
            : 'h-full bg-primary transition-[width] duration-200'
        }
        style={clamped >= 100 ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
