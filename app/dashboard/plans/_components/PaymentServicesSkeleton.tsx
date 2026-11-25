import { Skeleton } from '@/components/ui/skeleton';

/** Cuántas tarjetas fantasma se dibujan mientras carga el catálogo. */
const PLACEHOLDER_COUNT = 3;

/**
 * Esqueleto del catálogo.
 *
 * Reserva el mismo espacio que ocuparán las tarjetas para que la pantalla no salte cuando
 * lleguen los datos. No representa el número real de servicios —no se conoce todavía—, sólo
 * indica que algo está por aparecer.
 */
export default function PaymentServicesSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Cargando servicios"
    >
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        // Misma forma que `PaymentServiceCard`: periodicidad, nombre, descripción, precio,
        // "Incluye" con sus renglones y el botón de compra.
        <div
          key={index}
          className="flex flex-col gap-4 rounded-xl border p-8"
        >
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-36" />
          <div className="flex flex-col gap-3 border-t pt-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
