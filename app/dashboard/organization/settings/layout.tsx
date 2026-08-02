'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SETTINGS_TABS = [
  { value: '/dashboard/organization/settings/members', label: 'Miembros' },
  { value: '/dashboard/organization/settings/permissions', label: 'Permisos' },
];

/**
 * Bug corregido: `TabsTrigger` con `nativeButton={false}` + `render={<Link />}` produce un
 * mismatch de hidratación (Base UI emite `type="button"`/`aria-disabled` en el HTML de SSR pero
 * los omite en el primer render del cliente). Como este nav es puramente decorativo/navegación
 * (no hay un panel que cambiar in-place, cada "tab" es una ruta distinta), se difiere su montaje
 * al cliente: el pase de hidratación no incluye el componente (coincide con el HTML del server,
 * que tampoco lo renderiza), y `useEffect` lo monta justo después — sin discrepancia posible.
 */
export default function OrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      {mounted && (
        <Tabs value={pathname} onValueChange={() => {}}>
          <TabsList>
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                nativeButton={false}
                render={<Link href={tab.value} />}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {children}
    </div>
  );
}
