import Link from 'next/link';

import { ErrorAlert } from '@/components/ui/error-alert';
import {
  INSUFFICIENT_BIOMETRIC_CREDITS_HINT,
  INSUFFICIENT_BIOMETRIC_CREDITS_TITLE,
  insufficientBiometricCreditsMessage,
  type InsufficientBiometricCredits,
} from '../_insufficient-biometric-credits';

/** Pantalla donde se compran créditos. */
const BUY_CREDITS_HREF = '/dashboard/plans';

export interface InsufficientBiometricCreditsAlertProps {
  /** Créditos requeridos y disponibles del 402; `null` no dibuja nada. */
  credits: InsufficientBiometricCredits | null;
}

/**
 * Aviso de que el documento pide más firmas biométricas que créditos disponibles: cuántos hacen
 * falta, cuántos hay y qué hacer.
 *
 * "Comprar créditos" abre en otra pestaña: el formulario no guarda borrador, y navegar en esta
 * perdería el PDF y la configuración. Tras comprar, el mismo botón de envío reintenta.
 *
 * @param props - Ver `InsufficientBiometricCreditsAlertProps`.
 * @returns El aviso, o `null` si no hay error de saldo biométrico.
 *
 * @example
 * ```tsx
 * <InsufficientBiometricCreditsAlert credits={{ required: 3, available: 2 }} />
 * ```
 */
export default function InsufficientBiometricCreditsAlert({
  credits,
}: InsufficientBiometricCreditsAlertProps) {
  if (!credits) {
    return null;
  }

  return (
    <ErrorAlert
      title={INSUFFICIENT_BIOMETRIC_CREDITS_TITLE}
      message={
        <>
          <span className="block">
            {insufficientBiometricCreditsMessage(credits)}
          </span>
          <span className="block">{INSUFFICIENT_BIOMETRIC_CREDITS_HINT}</span>
          <Link
            href={BUY_CREDITS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block font-medium underline underline-offset-4"
          >
            Comprar créditos
          </Link>
        </>
      }
    />
  );
}
