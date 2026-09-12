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
import { useSwitchActiveAccount } from '@/lib/hooks/useSwitchActiveAccount';
import type { AccountListEntry } from '@/lib/store/types/auth-store.types';

function labelFor(account: AccountListEntry): string {
  return account.accountType === 'ORGANIZATION'
    ? (account.organizationName ?? 'Organización')
    : 'Mi cuenta personal';
}

/**
 * Selector de cuenta activa y acceso a "Crear organización".
 *
 * Cambiar de cuenta pasa por `useSwitchActiveAccount`, que vuelve a consultar el estado comercial
 * de la cuenta elegida: la guarda de rutas espera esa respuesta antes de habilitar nada, así que
 * pasar a una organización sin plan la manda a Planes y volver a la cuenta personal restaura sus
 * accesos.
 *
 * **"Crear organización" está disponible siempre**, sin depender del plan de la cuenta activa: crear
 * organizaciones ya no se cobra —lo que se paga es usarlas—, y el backend tampoco lo rechaza por
 * plan.
 */
export default function AccountSwitcher() {
  const router = useRouter();
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const switchActiveAccount = useSwitchActiveAccount();

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
          <DropdownMenuLabel>Cambiar de cuenta</DropdownMenuLabel>
          {accountsList.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => switchActiveAccount(account)}
            >
              {labelFor(account)}
              {account.id === activeAccount?.id && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Actual
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
