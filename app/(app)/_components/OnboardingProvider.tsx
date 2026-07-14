'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePatchUserStatus } from '@/lib/hooks/usePatchUserStatus';
import { useOnboardingStore } from '@/lib/store/useOnboardingStore';

export default function OnboardingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: user } = useCurrentUser();
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const patchStatusMutation = usePatchUserStatus();
  const queryClient = useQueryClient();
  const mutationRef = useRef(patchStatusMutation);
  mutationRef.current = patchStatusMutation;

  useEffect(() => {
    if (user) {
      hydrate(user);
    }
  }, [user, hydrate]);

  useEffect(() => {
    const unsubscribe = useOnboardingStore.subscribe((state) => {
      if (
        state.personalConfigured &&
        state.signatureConfigured &&
        !state.isConfigured &&
        !state.consolidationInFlight
      ) {
        useOnboardingStore.getState().markConsolidating(true);
        mutationRef.current.mutate(undefined, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            useOnboardingStore.getState().clear();
          },
          onError: () => {
            useOnboardingStore.getState().markConsolidating(false);
          },
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return <>{children}</>;
}
