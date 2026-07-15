'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnboardingProfile } from '@/lib/hooks/useOnboardingProfile';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { usePatchUserStatus } from '@/lib/hooks/usePatchUserStatus';
import { getAuthToken } from '@/lib/cookies';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { toAccountListEntry } from '@/lib/store/accounts-list.slice';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useOnboardingProfile();
  const { data: accounts } = useAccountsCatalog();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAccountsList = useAuthStore((state) => state.setAccountsList);
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

  // Regla A.2: primera sesión (sin tenant persistido) → cae a la cuenta PERSONAL.
  useEffect(() => {
    if (
      hasHydratedActiveAccount &&
      !activeAccount &&
      accounts &&
      accounts.length > 0
    ) {
      const personalAccount =
        accounts.find((account) => account.type === 'PERSONAL') ??
        accounts[0];
      setActiveAccount(toAccountListEntry(personalAccount));
    }
  }, [hasHydratedActiveAccount, accounts, activeAccount, setActiveAccount]);

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
