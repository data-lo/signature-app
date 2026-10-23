import { useAuthStore } from '@/lib/store/useAuthStore';
import { isSigningCredentialConfigured } from '@/lib/store/auth.slice';

/**
 * Único punto de verdad del frontend sobre si el usuario puede firmar con firma Simple.
 *
 * Sustituye a `useOnboardingReady`, que respondía otra pregunta —"¿terminó el onboarding?"—
 * cruzando `isConfigured` con dos banderas derivadas. Ese cálculo podía discrepar del backend:
 * tener la rúbrica subida no dice nada sobre si la identidad quedó validada, y era lo único que
 * miraba. Acá se lee el estado que el backend ya calculó.
 *
 * `isLoading` en true mientras el store todavía no hidrató `user`: "no sé" se trata distinto de
 * "sé que falta", para que ninguna pantalla muestre una advertencia que quizá no aplica sólo
 * porque el perfil aún no llegó.
 */
export function useSigningCredential() {
  const user = useAuthStore((state) => state.user);

  return {
    user,
    isLoading: !user,
    /**
     * Se llama por lo que habilita y no por el estado que lo produce, para que no pueda
     * confundirse con la retirada `isConfigured`, que respondía otra pregunta.
     */
    canSignWithSimpleSignature: isSigningCredentialConfigured(
      user?.signingCredentialStatus,
    ),
  };
}
