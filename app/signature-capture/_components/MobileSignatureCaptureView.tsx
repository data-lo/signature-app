'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Loader2, TriangleAlert } from 'lucide-react';
import { getAuthToken } from '@/lib/cookies';
import { getErrorMessage } from '@/lib/error-handler';
import {
  clearPendingSignatureCaptureToken,
  getPendingSignatureCaptureToken,
  setPendingSignatureCaptureToken,
} from '@/lib/pending-signature-capture';
import {
  useClaimSignatureCaptureSession,
  useSaveHandwrittenSignature,
} from '@/lib/hooks/useSignatureCapture';
import SignatureDrawer from '@/components/signature/SignatureDrawer';

/**
 * Pantalla que abre el QR en el celular.
 *
 * **Por qué decide la página y no el middleware.** `/signature-capture` está en `PUBLIC_ROUTES`
 * para que el token del QR llegue hasta acá: quien escanea suele hacerlo en un teléfono sin sesión
 * iniciada, y una redirección antes de renderizar se llevaría por delante el `?token=…`. Como el
 * QR es de un solo uso, se habría gastado sin canjearse. Aquí el token se guarda primero y después
 * se manda al usuario a iniciar sesión, que es de donde vuelve solo (ver `useLogin`).
 *
 * Que la ruta no pase por el guard no la deja abierta: sin sesión no se canjea nada, y el backend
 * comprueba además que quien reclama sea el mismo usuario que generó la captura.
 */
export default function MobileSignatureCaptureView() {
  const searchParams = useSearchParams();
  const claim = useClaimSignatureCaptureSession();
  const saveSignature = useSaveHandwrittenSignature();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  /** El canje es de un solo uso: sin esto, un re-render en React estricto lo intentaría dos veces. */
  const claimed = useRef(false);

  useEffect(() => {
    if (claimed.current) return;

    // El token puede venir en la URL (primera visita) o de `localStorage` (se vuelve de /login).
    const token =
      searchParams.get('token') ?? getPendingSignatureCaptureToken();

    if (!token) {
      setFatalError(
        'Este enlace no trae un código de firma. Vuelve a generar el código QR desde tu computadora.',
      );
      return;
    }

    if (!getAuthToken()) {
      // Se guarda ANTES de redirigir: es lo único que permite retomar la captura al volver.
      setPendingSignatureCaptureToken(token);
      window.location.href = '/login';
      return;
    }

    claimed.current = true;
    claim.mutate(token, {
      onSuccess: (session) => {
        clearPendingSignatureCaptureToken();
        setSessionId(session.id);
      },
      onError: (error) => {
        clearPendingSignatureCaptureToken();
        setFatalError(
          getErrorMessage(
            error,
            'Este código de firma ya no es válido. Genera uno nuevo desde tu computadora.',
          ),
        );
      },
    });
    // `claim` es estable entre renders y `searchParams` sólo cambia si cambia la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (fatalError) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <TriangleAlert className="size-8 text-destructive" aria-hidden />
          <h1 className="text-lg font-medium">No se puede firmar aquí</h1>
          <p className="text-sm text-muted-foreground">{fatalError}</p>
        </div>
      </Shell>
    );
  }

  if (saved) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <BadgeCheck
            className="size-8 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <h1 className="text-lg font-medium">Firma guardada</h1>
          <p className="text-sm text-muted-foreground">
            Ya puedes volver a tu computadora: la pantalla se actualiza sola.
          </p>
        </div>
      </Shell>
    );
  }

  if (!sessionId) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Preparando tu firma...
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex w-full flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-lg font-medium">Dibuja tu firma</h1>
          <p className="text-sm text-muted-foreground">
            Se guardará en tu cuenta y aparecerá en tu computadora.
          </p>
        </header>

        <SignatureDrawer
          height={260}
          saving={saveSignature.isPending}
          saveLabel="Confirmar firma"
          onSave={(png) =>
            saveSignature.mutate(
              { sessionId, png },
              { onSuccess: () => setSaved(true) },
            )
          }
        />
      </div>
    </Shell>
  );
}

/**
 * Contenedor a pantalla completa y centrado. La pantalla móvil no vive dentro del layout del
 * dashboard —no tiene menú ni navegación— porque el usuario llega a hacer una sola cosa y vuelve
 * a la computadora.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {children}
      </div>
    </main>
  );
}
