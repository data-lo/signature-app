import type { ReactNode } from 'react';
import { AlertTriangle, CircleCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Piezas compartidas por los dos estados de la vista pública de verificación (pendiente y
 * completado). Viven aparte para que las dos pantallas no puedan divergir en tipografía ni en
 * cómo tratan un valor ausente — que en una constancia importa: un renglón vacío se lee como "no
 * hay evidencia", no como "no lo mostramos".
 */

/**
 * Aviso superior que encabeza la pantalla. Solo dos variantes, y son las dos de la historia: el
 * documento está pendiente (warning) o ya lo firmaron todos (success).
 */
export function VerificationAlert({
  variant,
  children,
}: {
  variant: 'warning' | 'success';
  children: ReactNode;
}) {
  const isWarning = variant === 'warning';
  const Icon = isWarning ? AlertTriangle : CircleCheck;

  return (
    <div
      // `role="status"` y no `alert`: es el resumen del estado de la página, no una interrupción.
      role="status"
      data-variant={variant}
      className={
        isWarning
          ? 'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
          : 'flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

/** Una de las secciones numeradas de la historia (documento, PSC, firmantes, descargas). */
export function VerificationSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        {/* `<h2>` real y no `CardTitle`, que renderiza un `div`: esta pantalla es un documento de
            consulta —a menudo desde el teléfono, tras escanear un QR— y sin encabezados no hay
            forma de saltar entre secciones con un lector de pantalla. Se copian las clases de
            `CardTitle` para que se vea idéntico al resto de las tarjetas del proyecto. */}
        <h2
          data-slot="card-title"
          className="font-heading text-base leading-snug font-medium"
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Renglón etiqueta/valor. Un valor ausente OCULTA el renglón entero en vez de dejarlo vacío: es
 * lo que hace que los campos exclusivos de un tipo de firma no aparezcan para el otro, y evita
 * publicar huecos que se leerían como evidencia faltante.
 *
 * `mono` para los valores que se comparan carácter por carácter (hash, número de serie, la firma
 * en base64): con la fuente proporcional, un 0 y una O no se distinguen.
 */
export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 sm:flex-row sm:gap-4">
      <span className="text-xs tracking-wide text-muted-foreground uppercase sm:w-56 sm:shrink-0 sm:pt-0.5">
        {label}
      </span>
      <span
        className={
          // `break-all` y no `break-words`: un hash o un base64 es una sola "palabra" de cientos
          // de caracteres y sin esto desborda la tarjeta en móvil.
          mono
            ? 'min-w-0 flex-1 font-mono text-xs break-all text-foreground'
            : 'min-w-0 flex-1 text-sm break-words text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}
