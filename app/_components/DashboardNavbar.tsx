'use client';

import { useRouter } from 'next/navigation';
import { FileSignature, Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/lib/hooks/useLogout';

const navItems = [
  { label: 'GESTIONAR', active: true, href: '/dashboard' },
  { label: 'FIRMAR', active: false, href: null },
];

interface DashboardNavbarProps {
  documentsCount?: number;
}

export default function DashboardNavbar({ documentsCount }: DashboardNavbarProps) {
  const router = useRouter();
  const logoutMutation = useLogout();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 h-14">
      <div className="flex items-center gap-10">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="outline-none"
        >
          <FileSignature className="size-6 text-emerald-500" />
        </button>
        <nav className="flex items-center gap-8 h-14">
          {navItems.map((item) => (
            <span
              key={item.label}
              onClick={() => item.href && router.push(item.href)}
              className={`flex items-center h-full text-xs font-semibold tracking-wide cursor-pointer border-b-2 ${
                item.active
                  ? 'text-gray-900 border-emerald-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {item.label}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6 text-xs font-semibold tracking-wide text-gray-600">
        <span className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
          <Globe className="size-4" />
          ES
        </span>

        {typeof documentsCount === 'number' && <span>DOCUMENTOS:{documentsCount}</span>}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 outline-none hover:text-gray-900">
            CUENTA
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/personal-documents')}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="hover:text-gray-900 disabled:opacity-50"
        >
          {logoutMutation.isPending ? 'CERRANDO...' : 'CERRAR SESIÓN'}
        </button>
      </div>
    </header>
  );
}
