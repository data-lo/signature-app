'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  const personalConfigured = useAuthStore(
    (state) => state.user?.personalConfigured,
  );
  const signatureConfigured = useAuthStore(
    (state) => state.user?.signatureConfigured,
  );
  const isConfigured = useAuthStore((state) => state.user?.isConfigured);
  const consolidationInFlight = useAuthStore(
    (state) => state.consolidationInFlight,
  );
  // Bug corregido (SCRUM-12, bucle de redirección/carga infinita tras configurar la firma): este
  // efecto vivía como un useAuthStore.subscribe sin condición de corte — si el PATCH fallaba,
  // onError dejaba el estado exactamente como antes del intento (personalConfigured/
  // signatureConfigured en true, isConfigured en false, consolidationInFlight en false), lo que
  // volvía a cumplir la condición de disparo de inmediato y reintentaba sin límite ni backoff.
  // consolidationAttemptedRef corta ese ciclo: solo se reintenta automáticamente cuando
  // personalConfigured/signatureConfigured vuelven a cambiar de verdad (ver el efecto de abajo
  // que lo resetea), no en cada toggle de consolidationInFlight.
  const consolidationAttemptedRef = useRef(false);

  // Escenario 1: al aterrizar en /documents/create, /users/me (Redis por CURP) rellena
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

  // Un cambio real en cualquiera de las dos sub-banderas es la única señal válida de que vale la
  // pena reintentar la consolidación automáticamente (p. ej. el usuario borró y volvió a subir su
  // firma). Sin este reset, consolidationAttemptedRef se quedaría en true para siempre después
  // del primer intento fallido.
  useEffect(() => {
    consolidationAttemptedRef.current = false;
  }, [personalConfigured, signatureConfigured]);

  // Disparador automático de cierre: cuando ambas sub-banderas quedan en
  // true, consolida el onboarding con PATCH /me/status.
  useEffect(() => {
    if (
      !personalConfigured ||
      !signatureConfigured ||
      isConfigured ||
      consolidationInFlight ||
      consolidationAttemptedRef.current
    ) {
      return;
    }

    consolidationAttemptedRef.current = true;
    useAuthStore.getState().markConsolidating(true);
    mutationRef.current.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['onboardingProfile'] });
        useAuthStore.getState().markConsolidated();
      },
      onError: () => {
        useAuthStore.getState().markConsolidating(false);
        toast.error(
          'No se pudo finalizar la configuración de tu cuenta. Actualiza la página para reintentar.',
        );
      },
    });
  }, [
    personalConfigured,
    signatureConfigured,
    isConfigured,
    consolidationInFlight,
    queryClient,
  ]);

  return <>{children}</>;
}
