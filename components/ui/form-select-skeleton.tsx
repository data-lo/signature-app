import { Field, FieldTitle } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FormSelectSkeletonProps {
  /** Etiqueta del campo que está cargando. Sin ella, se dibuja una barra en su lugar. */
  label?: string;
  /**
   * Cuántas barras de carga se dibujan bajo la etiqueta. Por omisión una: el selector. Más
   * de una sirve para anticipar una lista de opciones que se muestra abierta.
   */
  rows?: number;
  className?: string;
}

/**
 * Marcador de carga para un selector cuyas opciones llegan de una consulta.
 *
 * Ocupa el mismo sitio que el `FormSelect` que va a sustituir —etiqueta arriba, control de la
 * misma altura—, así que el formulario no salta cuando llegan las opciones. Es lo que evita
 * mostrar un selector vacío que parece no tener opciones cuando en realidad todavía no llegaron.
 *
 * Es global y no conoce ningún dominio: sirve para cualquier formulario que cargue sus opciones
 * de forma asíncrona.
 *
 * Se anuncia como región de estado ocupada (`role="status"`, `aria-busy`) para que un lector de
 * pantalla diga que el campo está cargando en vez de callar.
 *
 * @param props - Etiqueta, número de barras y clases extra.
 * @returns La silueta del campo con animación de pulso.
 *
 * @example
 * ```tsx
 * if (rolesQuery.isLoading) return <FormSelectSkeleton label="Rol" />;
 * ```
 */
export function FormSelectSkeleton({
  label,
  rows = 1,
  className,
}: FormSelectSkeletonProps) {
  return (
    <Field
      role="status"
      aria-busy="true"
      aria-label={label ? `Cargando ${label}` : 'Cargando opciones'}
      data-slot="form-select-skeleton"
      className={className}
    >
      {label ? (
        <FieldTitle className="text-muted-foreground">{label}</FieldTitle>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <Skeleton
          key={index}
          data-slot="form-select-skeleton-row"
          className={cn('h-8 w-full rounded-lg', index > 0 && 'opacity-60')}
        />
      ))}
    </Field>
  );
}
