'use client';

import { useEffect, type ReactNode } from 'react';
import { useOnboardingProfile } from '@/lib/hooks/useOnboardingProfile';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { getAuthToken } from '@/lib/cookies';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Hidrata el store de sesión: perfil del usuario, catálogo de cuentas, tenant activo y estado
 * de facturación de ese tenant.
 *
 * Ya no resuelve la cuenta activa. Antes rehidrataba `activeAccount` desde `localStorage` y,
 * si no existía o ya no estaba en el catálogo, caía a la cuenta PERSONAL. Esas dos cosas se
 * mudaron al servidor: la cuenta activa vive en una cookie `HttpOnly` y el layout resuelve el
 * respaldo antes de renderizar (ver `get-authorization-context.server.ts`), de modo que el
 * primer HTML ya sale con la cuenta correcta en vez de corregirse después de hidratar.
 * `ActiveAccountBridge` refleja en el store lo que decidió el servidor.
 *
 * Ya no consolida ningún onboarding. Antes vivía acá un efecto que, en cuanto el usuario tenía
 * sus datos de contacto y su firma, disparaba `PATCH /users/me/status` para poner
 * `isConfigured` en true — la bandera que después decidía si podía entrar a crear documentos.
 * Esa cadena entera desapareció: crear documentos ya no depende de nada, y firmar depende de
 * `signingCredentialStatus`, que sólo mueve el backend. Con ella se fueron también el guard de
 * reintentos y el `toast` de "no se pudo finalizar la configuración de tu cuenta", que sólo
 * existían para sostener ese efecto.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const { data: accounts } = useAccountsCatalog();
  const { data: profile } = useOnboardingProfile();
  /**
   * Estado comercial de la cuenta activa —plan, saldo y beneficios—. Va acá y no en la pantalla
   * de suscripciones
   * porque hace falta desde el momento de entrar —y en cada cuenta a la que se cambie—, no sólo
   * cuando alguien abre esa pantalla. El hook se encarga solo del cambio de cuenta: la cuenta
   * forma parte de su `queryKey`, así que elegir otra en el switcher dispara la consulta nueva
   * sin ningún efecto acá. No se lee su resultado en este componente; se guarda en el store.
   */
  useBillingAccess();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAccountsList = useAuthStore((state) => state.setAccountsList);

  // Escenario 1: al aterrizar en /documents/create, /users/me (Redis por CURP) rellena el
  // perfil, incluido el estado de la credencial de firma.
  useEffect(() => {
    if (profile) {
      setAuth(getAuthToken() ?? '', profile);
    }
  }, [profile, setAuth]);

  useEffect(() => {
    if (accounts) {
      setAccountsList(accounts);
    }
  }, [accounts, setAccountsList]);

  return <>{children}</>;
}
