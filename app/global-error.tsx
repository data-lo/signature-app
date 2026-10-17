'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Último error boundary de la app: lo pinta Next cuando falla el propio layout raíz o un error de
 * render del cliente no tiene un `error.tsx` más cercano que lo atrape.
 *
 * Reporta el error a GlitchTip porque un error atrapado por un boundary ya no es "no controlado"
 * para el navegador, y la integración global del SDK no lo vería. Los errores del servidor
 * (con `digest`) ya los reportó `onRequestError`; volver a mandarlos aquí sólo agrega el lado del
 * cliente del mismo fallo, que GlitchTip agrupa.
 *
 * Reemplaza al layout raíz mientras se muestra, por eso trae su propio `<html>` y `<body>`.
 *
 * @param props.error - El error que llegó hasta aquí.
 * @param props.reset - Vuelve a intentar renderizar el segmento.
 * @returns La pantalla de error global.
 *
 * @example
 * ```tsx
 * // Lo monta Next; no se usa a mano.
 * <GlobalError error={error} reset={reset} />
 * ```
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md flex-col items-start gap-4">
          <h1 className="font-heading text-2xl font-medium">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado. Ya lo registramos; vuelve a intentarlo
            en un momento.
          </p>
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
        </div>
      </body>
    </html>
  );
}
