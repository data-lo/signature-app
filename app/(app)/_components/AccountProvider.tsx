'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { useAccountStore } from '@/lib/store/useAccountStore';

export default function AccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: accounts } = useAccountsCatalog();
  const hydrateToken = useAccountStore((state) => state.hydrateToken);
  const activeAccount = useAccountStore((state) => state.activeAccount);
  const setActiveAccount = useAccountStore((state) => state.setActiveAccount);
  const [hasHydratedAccount, setHasHydratedAccount] = useState(() =>
    useAccountStore.persist.hasHydrated(),
  );

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  useEffect(() => {
    const unsubscribe = useAccountStore.persist.onFinishHydration(() =>
      setHasHydratedAccount(true),
    );
    useAccountStore.persist.rehydrate();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (
      hasHydratedAccount &&
      !activeAccount &&
      accounts &&
      accounts.length > 0
    ) {
      const personalAccount =
        accounts.find((account) => account.type === 'PERSONAL') ??
        accounts[0];
      setActiveAccount(personalAccount);
    }
  }, [hasHydratedAccount, accounts, activeAccount, setActiveAccount]);

  return <>{children}</>;
}
