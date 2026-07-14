'use client';

import { useRouter, usePathname } from 'next/navigation';
import { FileSignature, ChevronDown, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLogout } from '@/lib/hooks/useLogout';
import AccountSwitcher from './AccountSwitcher';

const navItems = [
  { label: 'GESTIONAR', href: '/home' },
  { label: 'FIRMAR', href: '/documents' },
  { label: 'PLANES', href: '/plans' },
];

interface DashboardNavbarProps {
  documentsCount?: number;
}

export default function DashboardNavbar({
  documentsCount,
}: DashboardNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const logoutMutation = useLogout();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-8 h-14">
      <div className="flex items-center gap-10">
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="outline-none"
        >
          <FileSignature className="size-6 text-emerald-500" />
        </button>
        <nav className="flex items-center gap-8 h-14">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <span
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`flex items-center h-full text-xs font-semibold tracking-wide cursor-pointer border-b-2 ${
                  isActive
                    ? 'text-foreground border-emerald-500'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {item.label}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6 text-xs font-semibold tracking-wide text-muted-foreground">
        <ThemeToggle className="flex items-center gap-1 cursor-pointer hover:text-foreground" />

        <AccountSwitcher />

        {typeof documentsCount === 'number' && (
          <span
            className="cursor-pointer hover:text-foreground"
            onClick={() => router.push('/documents')}
          >
            DOCUMENTOS:{documentsCount}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-foreground">
            CUENTA
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Configuraciones</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push('/personal-documents')}
              >
                <User className="size-4" />
                Mi Perfil
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="hover:text-foreground disabled:opacity-50"
        >
          {logoutMutation.isPending ? 'CERRANDO...' : 'CERRAR SESIÓN'}
        </button>
      </div>
    </header>
  );
}
