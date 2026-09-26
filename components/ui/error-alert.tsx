import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ErrorAlertProps {
  /** Encabezado corto del error. Opcional: sin él, el aviso muestra sólo el mensaje. */
  title?: ReactNode;
  /** Qué salió mal y, de preferencia, qué hacer para continuar. Obligatorio. */
  message: ReactNode;
  className?: string;
}

/**
 * Indica si un mensaje de error tiene contenido que mostrar.
 *
 * `null`, `undefined`, `false` y las cadenas vacías o de puros espacios no cuentan: un aviso de
 * error sin texto no le dice nada al usuario.
 *
 * @param message - Mensaje recibido por `ErrorAlert`.
 * @returns `true` si hay algo que mostrar; `false` si el mensaje está vacío.
 *
 * @example
 * ```ts
 * hasErrorMessage('   '); // false
 * hasErrorMessage('No se pudo enviar.'); // true
 * ```
 */
export function hasErrorMessage(message: ReactNode): boolean {
  if (message === null || message === undefined || message === false) {
    return false;
  }
  return typeof message !== 'string' || message.trim().length > 0;
}

/**
 * Aviso de error estándar de la aplicación: `Alert` destructivo con ícono, título opcional y
 * mensaje obligatorio.
 *
 * El mensaje es obligatorio por tipo; si llega vacío (ver `hasErrorMessage`) el componente no
 * renderiza nada, así que puede recibir directamente un error "posiblemente ausente" sin que el
 * llamador tenga que envolverlo en un condicional. Se anuncia con `role="alert"`.
 *
 * @param props - Ver `ErrorAlertProps`.
 * @returns El aviso de error, o `null` si el mensaje está vacío.
 *
 * @example
 * ```tsx
 * <ErrorAlert
 *   title="No se pudo enviar"
 *   message="Selecciona la ubicación de la firma antes de continuar."
 * />
 * ```
 */
export function ErrorAlert({ title, message, className }: ErrorAlertProps) {
  if (!hasErrorMessage(message)) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert aria-hidden />
      {hasErrorMessage(title) && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
