'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { describePaymentsError } from './_errors';

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
 *
 * El mensaje depende de la causa (ver `_errors.ts`). Antes era uno solo para todo, y eso fue
 * justamente lo que hizo que un fallo de configuración del entorno desplegado se reportara como
 * "no cargan los planes", sin ninguna pista de por dónde empezar a buscar.
 */
export default function PlansError({ error, reset }: PlansErrorProps) {
  const { title, description, canRetry, status } = describePaymentsError(error);

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
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {canRetry && (
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
        )}

        {/*
          El código HTTP es lo primero que pide soporte y lo que hoy había que ir a buscar a la
          consola del navegador. Se muestra discreto y sin jerga: no le estorba a quien no lo
          necesita, y le ahorra una ida y vuelta a quien sí.
        */}
        {status !== null && (
          <p className="text-xs text-muted-foreground">
            Código de error: {status}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
