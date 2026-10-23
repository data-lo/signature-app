'use client';

import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Loader2, Plus } from 'lucide-react';
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

/**
 * Cómo se llama cada cuenta en el selector.
 *
 * Una organización se rotula con su **nombre de visualización**, que es para lo que se pide en el
 * alta: "Acme", no "Acme Corp S.A. de C.V.". La razón social queda de respaldo —es lo que este
 * selector mostró hasta ahora, y lo que el store rellena cuando el backend no manda el nombre
 * corto—, y 'Organización' para el caso en que no llegue ninguno de los dos.
 *
 * Una cuenta personal no tiene nombre que elegir: es una sola por usuario y se llama igual para
 * todos.
 */
function labelFor(account: AccountListEntry): string {
  if (account.accountType !== 'ORGANIZATION') return 'Mi cuenta personal';

  return (
    account.organizationDisplayName ??
    account.organizationName ??
    'Organización'
  );
}

/**
 * Selector de cuenta activa y acceso a "Crear organización".
 *
 * Cambiar de cuenta pasa por `useSwitchActiveAccount`, que vacía los permisos, tira el caché de
 * las dos cuentas implicadas, escribe la cookie desde el servidor y vuelve a pedir el layout. El
 * estado comercial se recarga con él, así que pasar a una organización sin plan sigue mandando a
 * Planes y volver a la cuenta personal restaura sus accesos.
 *
 * **Mientras el cambio está en curso el selector se deshabilita y lo dice.** No es un adorno: en
 * ese rato el menú ya está vacío —los permisos viejos se descartaron y los nuevos no han
 * llegado—, y sin señal alguna parecería que la aplicación se rompió.
 *
 * **"Crear organización" está disponible siempre**, sin depender del plan de la cuenta activa: crear
 * organizaciones ya no se cobra —lo que se paga es usarlas—, y el backend tampoco lo rechaza por
 * plan.
 */
export default function AccountSwitcher() {
  const router = useRouter();
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { switchActiveAccount, isSwitching } = useSwitchActiveAccount();

  const activeEntry = accountsList.find(
    (account) => account.id === activeAccount?.id,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isSwitching}
        className="flex items-center gap-1 outline-none hover:text-foreground disabled:opacity-60"
      >
        {isSwitching ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Building2 className="size-3.5" />
        )}
        {isSwitching
          ? 'Cambiando…'
          : activeEntry
            ? labelFor(activeEntry)
            : 'Cuenta'}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar de cuenta</DropdownMenuLabel>
          {accountsList.map((account) => (
            <DropdownMenuItem
              key={account.id}
              disabled={isSwitching}
              onClick={() => void switchActiveAccount(account)}
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
