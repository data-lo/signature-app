'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  EMPTY_DATE_PLACEHOLDER,
  formatFullDateTime,
  formatShortDate,
} from '@/lib/format-datetime';

interface DocumentDateProps {
  /** Fecha ISO tal como la devuelve el backend (`createdAt`, `signedAt`). */
  date: string | Date | null | undefined;
  /** Lo que se muestra, atenuado, cuando no hay fecha o no es parseable. */
  emptyLabel?: string;
}

/**
 * Fecha de la tabla de documentos: el formato compacto `DD/MM/YYYY` a la vista y, en un tooltip,
 * la fecha completa con hora de 24 horas (`"LUNES 20 DE NOVIEMBRE 16:00"`).
 *
 * Sin fecha válida no hay tooltip: se muestra `emptyLabel` como texto plano, para no abrir un
 * aviso vacío ni con un valor inválido. El disparador es un botón (el de `TooltipTrigger`) para
 * que el detalle también se alcance con el teclado; como el contenido del tooltip no se anuncia
 * por sí solo, la fecha completa va además en un texto `sr-only` dentro del disparador. El clic
 * sobre la fecha no se detiene: sigue subiendo a la fila y abre el detalle como cualquier otra
 * celda.
 *
 * Las dos fechas se resuelven en la zona horaria del navegador, que es la del usuario: la
 * aplicación no tiene hoy una zona configurada. Si llega a tenerla, hay que pasarla a
 * `formatFullDateTime` y también a `formatShortDate`, para que ambas digan el mismo día.
 *
 * @param props - Ver `DocumentDateProps`.
 * @returns La fecha con su tooltip, o `emptyLabel` atenuado si no hay fecha válida.
 *
 * @example
 * ```tsx
 * <DocumentDate date={doc.signedAt} emptyLabel="No disponible" />
 * ```
 */
export default function DocumentDate({
  date,
  emptyLabel = EMPTY_DATE_PLACEHOLDER,
}: DocumentDateProps) {
  const fullDateTime = formatFullDateTime(date);

  if (fullDateTime === null) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-[inherit] rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {formatShortDate(date)}
        <span className="sr-only">, {fullDateTime}</span>
      </TooltipTrigger>
      <TooltipContent>{fullDateTime}</TooltipContent>
    </Tooltip>
  );
}
