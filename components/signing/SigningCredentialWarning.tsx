'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/** Ruta única de la pantalla donde el usuario configura su identidad y su firma. */
export const IDENTITY_SETUP_PATH = '/dashboard/personal-documents/identity';

/**
 * Aviso de que la credencial de firma todavía no está configurada.
 *
 * Es informativo y nunca bloquea: quien lo ve puede seguir haciendo lo que estaba haciendo
 * —crear el documento, revisar la pantalla— y resolver su verificación después. Lo único que de
 * verdad se impide es firmar con firma Simple, y eso lo rechaza el backend.
 *
 * Vive en `components/` y no dentro de una pantalla porque lo muestran dos flujos distintos
 * (identidad y creación de documentos) con el mismo criterio; separarlos habría dejado dos
 * versiones del mismo aviso que podrían divergir.
 */
export default function SigningCredentialWarning({
  message,
  actionLabel,
}: {
  message: string;
  /** Texto del enlace a la configuración. Si se omite, el aviso va sin enlace. */
  actionLabel?: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{message}</p>
      </div>
      {actionLabel && (
        <Link
          href={IDENTITY_SETUP_PATH}
          className="self-start underline underline-offset-2 hover:opacity-80"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
