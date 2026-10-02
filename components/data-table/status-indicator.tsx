import { cn } from '@/lib/utils';

/** Tono del punto de estado. Es semántico: cada tabla decide qué estados caen en cuál. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Color del punto por tono; los mismos que usaba la columna "Estatus" de Documentos. */
export const STATUS_TONE_DOT: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  neutral: 'bg-gray-400',
};

/**
 * Punto de color de un estado, sin texto. Lo usa la columna principal de Documentos para
 * anticipar el estatus junto al nombre.
 *
 * @param props.tone - Tono del estado.
 * @param props.className - Clases extra.
 * @returns El punto, oculto para lectores de pantalla (el texto del estado va aparte).
 *
 * @example
 * ```tsx
 * <StatusDot tone="success" />
 * ```
 */
export function StatusDot({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-slot="status-dot"
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        STATUS_TONE_DOT[tone],
        className,
      )}
    />
  );
}

/**
 * Estado de un registro como en la tabla de Documentos: punto de color y etiqueta.
 *
 * Reemplaza a los `Badge` que usaban Miembros y Roles: en una tabla, una píldora por fila pesa
 * más que el dato que muestra, y Documentos ya había fijado el punto como la forma de leer un
 * estado de un vistazo.
 *
 * @param props.tone - Tono del estado.
 * @param props.label - Texto del estado.
 * @returns El estado con su punto.
 *
 * @example
 * ```tsx
 * <StatusIndicator tone="warning" label="Invitación pendiente" />
 * ```
 */
export function StatusIndicator({
  tone,
  label,
}: {
  tone: StatusTone;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <StatusDot tone={tone} />
      <span>{label}</span>
    </span>
  );
}
