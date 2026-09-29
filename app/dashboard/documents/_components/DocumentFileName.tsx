'use client';

import { useRef, useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DocumentFileNameProps {
  /** Nombre completo del archivo, tal como lo devuelve el backend. */
  fileName: string;
  /**
   * Si la fila abre el detalle al activarse: el nombre es entonces un botón (el paso de teclado de
   * la fila) con subrayado en hover. El clic no se maneja aquí, sube hasta el `onClick` de la fila.
   */
  interactive?: boolean;
}

/**
 * Indica si el texto del elemento está recortado por `text-overflow: ellipsis`.
 *
 * Se mide al momento de abrir y no con un `ResizeObserver`: lo único que importa es si está
 * recortado CUANDO el usuario pide el tooltip, y así la tabla no carga un observador por fila.
 *
 * @param element - El elemento con `truncate`, o `null` si aún no está montado.
 * @returns `true` si el contenido es más ancho que el espacio visible.
 *
 * @example
 * ```ts
 * isTextTruncated(buttonRef.current); // true con "Contrato de prestación de servi…"
 * ```
 */
export function isTextTruncated(element: HTMLElement | null): boolean {
  return element !== null && element.scrollWidth > element.clientWidth;
}

/**
 * Nombre del documento en la tabla: una sola línea, recortada con puntos suspensivos cuando no
 * cabe en la columna, y el nombre completo en el Tooltip del proyecto.
 *
 * - **No altera la fila ni la columna.** El recorte es sólo visual (`truncate`: `overflow-hidden`,
 *   `text-ellipsis`, `whitespace-nowrap`) dentro del ancho que fija la celda, así que un nombre
 *   largo ya no parte el texto en varias líneas ni empuja las demás columnas. El tooltip se pinta
 *   en un portal, fuera del flujo de la tabla.
 * - **El tooltip sólo aparece si el nombre está recortado.** Un nombre corto se lee entero en la
 *   celda, y repetirlo en un globo sería ruido. Por eso el tooltip es controlado: `onOpenChange`
 *   sólo lo deja abrir cuando `isTextTruncated` lo confirma.
 * - **Teclado.** Con navegación, el disparador es un botón: se alcanza con Tab, el tooltip se
 *   abre también con el foco, y Enter/Espacio emiten un clic que sube a la fila y abre el detalle,
 *   como antes. Sin navegación es un `span` enfocable: no se anuncia como control, pero el
 *   tooltip sigue abriéndose con el foco.
 * - **Lectores de pantalla.** El recorte no toca el texto del DOM, que sigue siendo el nombre
 *   completo. En el botón, `aria-label` lo fija además como nombre accesible, para que no dependa
 *   de cómo cada lector trate el contenido del tooltip.
 *
 * @param props - Ver `DocumentFileNameProps`.
 * @returns El nombre recortable con su tooltip.
 *
 * @example
 * ```tsx
 * <DocumentFileName fileName={doc.fileName} interactive={Boolean(onRowSelect)} />
 * ```
 */
export default function DocumentFileName({
  fileName,
  interactive = false,
}: DocumentFileNameProps) {
  // Tipado como botón porque así lo declara `TooltipTrigger`; sin navegación el elemento real es
  // un `span`, y `isTextTruncated` sólo usa lo que comparten los dos.
  const nameRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(nextOpen) =>
        setOpen(nextOpen && isTextTruncated(nameRef.current))
      }
    >
      <TooltipTrigger
        ref={nameRef}
        // Sin navegación la fila no es un control, y un botón que no hace nada mentiría: el
        // disparador pasa a ser un `span` enfocable, que conserva el tooltip con teclado.
        render={interactive ? undefined : <span tabIndex={0} />}
        // En el `span` no va: ARIA no admite `aria-label` sin rol, y su texto ya es el nombre
        // completo (el recorte es sólo visual).
        aria-label={interactive ? fileName : undefined}
        className={cn(
          'block w-full min-w-0 truncate rounded-sm text-left cursor-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          interactive && 'hover:underline',
        )}
      >
        {fileName}
      </TooltipTrigger>
      {/* Los nombres de archivo suelen no tener espacios: sin `break-words` uno largo se saldría
          del ancho máximo del tooltip en vez de pasar a la línea siguiente. */}
      <TooltipContent className="break-words">{fileName}</TooltipContent>
    </Tooltip>
  );
}
