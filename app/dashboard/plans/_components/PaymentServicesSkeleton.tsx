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
        <div
          key={index}
          className="flex flex-col gap-4 rounded-xl border p-6"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
