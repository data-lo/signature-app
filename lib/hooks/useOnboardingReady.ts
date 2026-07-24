import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Único punto de verdad para "¿el usuario ya completó el onboarding (información personal +
 * firma)?" — antes esta cuenta vivía duplicada solo dentro de HomeContent; se extrae aquí para
 * que cualquier otra pantalla que necesite el mismo guard (ver CreateDocumentGuard) use
 * exactamente el mismo criterio sin arriesgarse a que ambos cálculos diverjan con el tiempo.
 *
 * `isLoading` en true mientras el store todavía no terminó de hidratar `user` (ver
 * AuthProvider) — evita que un guard redirija de más solo porque los datos no han llegado
 * todavía, tratando "no sé" distinto de "sé que falta".
 */
export function useOnboardingReady() {
  const user = useAuthStore((state) => state.user);

  const isReady = Boolean(
    user && (user.isConfigured || (user.personalConfigured && user.signatureConfigured)),
  );

  return { user, isLoading: !user, isReady };
}
