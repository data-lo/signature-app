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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  ORGANIZATION_ACCOUNT_TOOLTIP,
  useCanCreateOrganization,
} from '@/lib/hooks/useCanCreateOrganization';
import type { AccountListEntry } from '@/lib/store/types/auth-store.types';

function labelFor(account: AccountListEntry): string {
  return account.accountType === 'ORGANIZATION'
    ? (account.organizationName ?? 'Organización')
    : 'Mi cuenta personal';
}

export default function AccountSwitcher() {
  const router = useRouter();
  const accountsList = useAuthStore((state) => state.accountsList);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);
  const puedeCrearOrganizacion = useCanCreateOrganization();

  function handleSelect(account: AccountListEntry) {
    setActiveAccount(account);
  }

  const activeEntry = accountsList.find(
    (account) => account.id === activeAccount?.id,
  );

  /**
   * La opción bloqueada NO usa el `disabled` del menú, y no es un descuido.
   *
   * Un elemento deshabilitado de verdad deja de recibir puntero y foco, así que el tooltip que
   * explica el bloqueo no llegaría a verse nunca —ni con el ratón ni con el teclado— y el usuario
   * se quedaría con una opción muerta y sin motivo. Con `aria-disabled` la opción sigue siendo
   * accesible y anunciándose como deshabilitada, que es justo lo que hace falta: el lector de
   * pantalla dice que no se puede, y el tooltip dice por qué. Es el mismo criterio que ya sigue
   * el botón de comprar documentos (ver `AddDocumentsDialog`).
   *
   * `closeOnClick={false}` cierra el círculo: si el menú se cerrara al pulsar, el tooltip se
   * iría con él y pulsar parecería un fallo en vez de un bloqueo.
   */
  const crearOrganizacion = (
    <DropdownMenuItem
      aria-disabled={!puedeCrearOrganizacion}
      closeOnClick={puedeCrearOrganizacion}
      className={
        puedeCrearOrganizacion
          ? undefined
          : 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
      }
      onClick={(event) => {
        if (!puedeCrearOrganizacion) {
          event.preventDefault();
          return;
        }
        router.push('/dashboard/organization/create');
      }}
    >
      <Plus className="size-4" />
      Crear organización
    </DropdownMenuItem>
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
              onClick={() => handleSelect(account)}
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
        {puedeCrearOrganizacion ? (
          crearOrganizacion
        ) : (
          <Tooltip>
            <TooltipTrigger render={crearOrganizacion} />
            <TooltipContent>{ORGANIZATION_ACCOUNT_TOOLTIP}</TooltipContent>
          </Tooltip>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
