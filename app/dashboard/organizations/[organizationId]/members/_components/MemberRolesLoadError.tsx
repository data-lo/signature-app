'use client';

import { AlertCircle } from 'lucide-react';

/** Texto del error. Dice qué hacer, no qué falló por dentro. */
export const ROLES_LOAD_ERROR_MESSAGE =
  'No pudimos cargar los roles de la organización. Cierra la ventana y vuelve a abrirla para reintentar.';

/**
 * El aviso de que el catálogo de roles no se pudo cargar.
 *
 * Vive aparte porque lo muestran los DOS modales que eligen rol —invitar y editar rol— y los dos
 * se abren sobre un diálogo: la única salida que tiene quien lo lee es cerrar y volver a abrir,
 * que es justo lo que dice el mensaje. Tenerlo repetido en cada modal ya se pagó una vez: el
 * filtrado de roles se arregló sólo en "Invitar miembro" y "Editar rol" se quedó atrás.
 *
 * @returns El bloque de error, anunciado como alerta para un lector de pantalla.
 *
 * @example
 * ```tsx
 * if (rolesQuery.isError) return <MemberRolesLoadError />;
 * ```
 */
export default function MemberRolesLoadError() {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{ROLES_LOAD_ERROR_MESSAGE}</span>
    </div>
  );
}
