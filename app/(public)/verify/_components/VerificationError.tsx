import { CircleX } from 'lucide-react';

import type { VerificationFailure } from '../_hooks/useDocumentVerification';

/**
 * Fallo de la consulta: el backend rechazó el archivo o no se pudo conectar.
 *
 * Es distinto de un resultado `INVALID` o `ERROR` (ver `VerificationResult`): aquí no hubo
 * respuesta de verificación que mostrar. `role="alert"` porque llega después de que el usuario
 * presionó el botón y tiene que enterarse aunque no esté mirando esa parte de la pantalla.
 *
 * @param props.failure - Título y mensaje del fallo (ver `toVerificationFailure`).
 * @returns El aviso de error.
 *
 * @example
 * ```tsx
 * {failure && <VerificationError failure={failure} />}
 * ```
 */
export function VerificationError({
  failure,
}: {
  failure: VerificationFailure;
}) {
  return (
    <div
      role="alert"
      data-failure={failure.kind}
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{failure.title}</p>
        <p>{failure.message}</p>
      </div>
    </div>
  );
}
