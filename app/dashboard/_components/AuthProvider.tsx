'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useOnboardingProfile } from '@/lib/hooks/useOnboardingProfile';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { getAuthToken } from '@/lib/cookies';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Hidrata el store de sesión: perfil del usuario, catálogo de cuentas y tenant activo.
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
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAccountsList = useAuthStore((state) => state.setAccountsList);
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);
  const [hasHydratedActiveAccount, setHasHydratedActiveAccount] = useState(
    () => useAuthStore.persist.hasHydrated(),
  );

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

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() =>
      setHasHydratedActiveAccount(true),
    );
    useAuthStore.persist.rehydrate();
    return unsubscribe;
  }, []);

  // Regla A.2: primera sesión (sin tenant persistido) → cae a la cuenta
  // PERSONAL. También revalida un activeAccount persistido que ya no exista
  // en el catálogo fresco (acceso revocado, organización eliminada) y hace
  // el mismo fallback. Se compara contra accountsList (el store, ya
  // actualizado por addAccount al crear una organización) y no contra
  // `accounts` de React Query directamente: ese caché queda a propósito sin
  // invalidar tras crear una organización (ver useCreateOrganization), así
  // que compararlo aquí habría regresado al usuario a su cuenta personal
  // justo después de crear la organización nueva.
  useEffect(() => {
    if (!hasHydratedActiveAccount || accountsList.length === 0) {
      return;
    }

    const activeAccountStillValid =
      activeAccount != null &&
      accountsList.some((account) => account.id === activeAccount.id);

    if (!activeAccountStillValid) {
      const personalAccount =
        accountsList.find((account) => account.accountType === 'PERSONAL') ??
        accountsList[0];
      setActiveAccount(personalAccount);
    }
  }, [hasHydratedActiveAccount, accountsList, activeAccount, setActiveAccount]);

  return <>{children}</>;
}
