'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SETTINGS_TABS = [
  { value: '/dashboard/organization/settings/members', label: 'Miembros' },
  { value: '/dashboard/organization/settings/permissions', label: 'Permisos' },
];

export default function OrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <Tabs value={pathname} onValueChange={() => {}}>
        <TabsList>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              render={<Link href={tab.value} />}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
