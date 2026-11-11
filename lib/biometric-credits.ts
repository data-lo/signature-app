import type { BillingAccess } from '@/lib/api/billing';

/**
 * Indica si conviene mostrar el saldo de firmas biométricas de la cuenta activa.
 *
 * - Si el backend no manda el campo (uno anterior a los créditos biométricos), no se muestra: un
 *   `0` inventado diría que la cuenta se quedó sin saldo sin saberlo.
 * - Se muestra si el plan incluye la firma biométrica, o si la cuenta tiene saldo aunque su plan ya
 *   no la incluya: los créditos comprados siguen siendo suyos.
 *
 * @param billing - Estado de facturación de la cuenta activa.
 * @returns `true` si hay que dibujar el saldo biométrico.
 *
 * @example
 * ```ts
 * shouldShowBiometricCredits(buildBillingAccess({ biometricCreditsAvailable: 4 })); // true
 * ```
 */
export function shouldShowBiometricCredits(
  billing: Pick<BillingAccess, 'biometricCreditsAvailable' | 'actions'>,
): boolean {
  if (typeof billing.biometricCreditsAvailable !== 'number') {
    return false;
  }

  return (
    billing.actions.graphSignatureBiometrics ||
    billing.biometricCreditsAvailable > 0
  );
}

/**
 * Leyenda corta del saldo de firmas biométricas, con el plural correcto.
 *
 * @param credits - Créditos biométricos disponibles.
 * @returns La leyenda para mostrar.
 *
 * @example
 * ```ts
 * biometricAvailabilityLabel(0); // 'Sin firmas biométricas disponibles'
 * biometricAvailabilityLabel(1); // '1 firma biométrica'
 * biometricAvailabilityLabel(8); // '8 firmas biométricas'
 * ```
 */
export function biometricAvailabilityLabel(credits: number): string {
  if (credits === 0) {
    return 'Sin firmas biométricas disponibles';
  }

  if (credits === 1) {
    return '1 firma biométrica';
  }

  return `${credits} firmas biométricas`;
}
