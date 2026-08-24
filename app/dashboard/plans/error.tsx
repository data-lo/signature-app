'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/app/dashboard/_components/PageContainer';

interface PlansErrorProps {
  error: Error & { digest?: string };
  /** Vuelve a montar el segmento; react-query reintenta la consulta al remontarse. */
  reset: () => void;
}

/**
 * Error boundary del segmento de planes.
 *
 * Lo levantan tanto la consulta del catálogo como la creación del Checkout, ambas con
 * `throwOnError`. Se prefiere esta pantalla completa a un aviso incrustado por una razón
 * concreta: si el catálogo falla a medias, unas tarjetas visibles junto a un mensaje de error
 * dejan al usuario sin saber si lo que ve es todo lo que hay — y comprando sobre información
 * incompleta.
 */
export default function PlansError({ error, reset }: PlansErrorProps) {
  useEffect(() => {
    // El detalle va a la consola, no a la pantalla: puede traer rutas internas o datos del
    // proveedor que no le sirven al usuario.
    console.error('[plans] error boundary', error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex max-w-md flex-col items-start gap-4">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium text-foreground">
            No pudimos cargar los planes
          </h1>
          <p className="text-sm text-muted-foreground">
            Hubo un problema al comunicarnos con el servicio de pagos. No se
            realizó ningún cargo.
          </p>
        </div>

        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </PageContainer>
  );
}
