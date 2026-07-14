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
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { useAccountStore } from '@/lib/store/useAccountStore';
import type { AccountData } from '@/lib/api/accounts';

export default function AccountSwitcher() {
  const router = useRouter();
  const { data: accounts } = useAccountsCatalog();
  const activeAccount = useAccountStore((state) => state.activeAccount);
  const setActiveAccount = useAccountStore((state) => state.setActiveAccount);

  function handleSelect(account: AccountData) {
    setActiveAccount(account);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-foreground">
        <Building2 className="size-3.5" />
        {activeAccount?.name ?? 'Cuenta'}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tus cuentas</DropdownMenuLabel>
          {accounts?.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => handleSelect(account)}
            >
              {account.name}
              {account.id === activeAccount?.id && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Activa
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/organization/create')}>
          <Plus className="size-4" />
          Crear organización
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
