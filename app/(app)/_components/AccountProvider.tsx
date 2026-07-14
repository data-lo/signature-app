'use client';

import { useEffect, type ReactNode } from 'react';
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

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  useEffect(() => {
    if (!activeAccount && accounts && accounts.length > 0) {
      const personalAccount =
        accounts.find((account) => account.type === 'PERSONAL') ??
        accounts[0];
      setActiveAccount(personalAccount);
    }
  }, [accounts, activeAccount, setActiveAccount]);

  return <>{children}</>;
}
