import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SectionLoadingProps {
  /**
   * Qué se está cargando, para lectores de pantalla. El esqueleto es puramente visual: sin este
   * texto, quien navega con lector no recibe ninguna señal de que la pantalla está trabajando.
   */
  label: string;
  /** Filas del esqueleto de tabla. Por defecto cinco, suficiente para ocupar el alto habitual. */
  rows?: number;
  className?: string;
}

/**
 * Indicador de carga compartido de las secciones renderizadas en el servidor.
 *
 * Es el componente que consumen los `loading.tsx`: Next lo muestra automáticamente al navegar a
 * la sección, mientras se resuelve la petición SSR, y lo reemplaza por el contenido en cuanto
 * llega. Se dibuja con la forma de una cabecera más una tabla —que es lo que hay detrás en todas
 * las secciones que lo usan— para que el cambio no desplace la página al resolverse.
 *
 * Vive en `components/ui` y no junto a una sección concreta porque su razón de ser es que todas
 * las secciones SSR carguen igual; un esqueleto por sección es justamente lo que hace que dos
 * pantallas del mismo producto se sientan de productos distintos.
 *
 * @param props - Etiqueta accesible, número de filas y clases adicionales.
 * @returns El esqueleto de carga de la sección.
 * @throws Nada: es un componente de presentación sin efectos ni dependencias externas.
 *
 * @example
 * ```tsx
 * export default function Loading() {
 *   return <SectionLoading label="Cargando los miembros de la organización" />;
 * }
 * ```
 */
export function SectionLoading({
  label,
  rows = 5,
  className,
}: SectionLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex w-full flex-col gap-4', className)}
    >
      <span className="sr-only">{label}</span>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
