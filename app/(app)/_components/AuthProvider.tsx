'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnboardingProfile } from '@/lib/hooks/useOnboardingProfile';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { usePatchUserStatus } from '@/lib/hooks/usePatchUserStatus';
import { getAuthToken } from '@/lib/cookies';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { data: accounts } = useAccountsCatalog();
  const { data: profile } = useOnboardingProfile();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAccountsList = useAuthStore((state) => state.setAccountsList);
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);
  const patchStatusMutation = usePatchUserStatus();
  const queryClient = useQueryClient();
  const mutationRef = useRef(patchStatusMutation);
  mutationRef.current = patchStatusMutation;
  const [hasHydratedActiveAccount, setHasHydratedActiveAccount] = useState(
    () => useAuthStore.persist.hasHydrated(),
  );

  // Escenario 1: al aterrizar en /home, /users/me (Redis por CURP) rellena
  // el perfil y calcula personalConfigured/signatureConfigured.
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

  // Disparador automático de cierre: cuando ambas sub-banderas quedan en
  // true, consolida el onboarding con PATCH /me/status.
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (
        state.user?.personalConfigured &&
        state.user?.signatureConfigured &&
        !state.user?.isConfigured &&
        !state.consolidationInFlight
      ) {
        useAuthStore.getState().markConsolidating(true);
        mutationRef.current.mutate(undefined, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
            useAuthStore.getState().markConsolidated();
          },
          onError: () => {
            useAuthStore.getState().markConsolidating(false);
          },
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return <>{children}</>;
}
