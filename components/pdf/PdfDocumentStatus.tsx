'use client';

import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Estado "cargando" de un visor de PDF, con el porcentaje descargado cuando se conoce.
 *
 * Con documentos grandes la descarga puede tardar varios segundos: un porcentaje que avanza
 * distingue "está llegando" de "se quedó colgado", que es lo que un texto fijo no puede decir.
 *
 * @param props.progress - Porcentaje descargado (0–100), o `null` si no se conoce.
 * @returns El mensaje de carga, anunciado a lectores de pantalla.
 *
 * @example
 * ```tsx
 * <PdfLoadingMessage progress={loader.progress} />
 * ```
 */
export function PdfLoadingMessage({ progress }: { progress: number | null }) {
  return (
    <p
      role="status"
      className="mt-20 flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {progress === null
        ? 'Cargando documento...'
        : `Cargando documento... ${progress}%`}
    </p>
  );
}

/**
 * Estado de error de un visor de PDF, con un botón para volver a intentarlo.
 *
 * Antes el visor sólo decía "Error al cargar el documento." y la única salida era recargar la
 * pantalla entera, perdiendo lo que el usuario llevaba configurado.
 *
 * @param props.onRetry - Vuelve a pedir y parsear el documento.
 * @returns El mensaje de error con su botón de reintento.
 *
 * @example
 * ```tsx
 * <PdfLoadErrorMessage onRetry={loader.retry} />
 * ```
 */
export function PdfLoadErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-20 flex flex-col items-center gap-3 px-6 text-center"
    >
      <p className="text-sm text-destructive">
        No se pudo cargar el documento. Revisa tu conexión e inténtalo de nuevo.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RotateCw aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}
