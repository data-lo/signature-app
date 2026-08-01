'use client';

import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountListEntry } from '@/lib/store/types/auth-store.types';

function labelFor(account: AccountListEntry): string {
  return account.accountType === 'ORGANIZATION'
    ? (account.organizationName ?? 'Organización')
    : 'Cuenta personal';
}

export default function AccountSwitcher() {
  const router = useRouter();
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);

  function handleSelect(account: AccountListEntry) {
    setActiveAccount(account);
  }

  const activeEntry = accountsList.find(
    (account) => account.id === activeAccount?.id,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-foreground">
        <Building2 className="size-3.5" />
        {activeEntry ? labelFor(activeEntry) : 'Cuenta'}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tus cuentas</DropdownMenuLabel>
          {accountsList.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => handleSelect(account)}
            >
              {labelFor(account)}
              {account.id === activeAccount?.id && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Activa
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/organization/create')}
        >
          <Plus className="size-4" />
          Crear organización
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
