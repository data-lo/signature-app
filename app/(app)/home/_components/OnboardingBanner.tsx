'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function OnboardingBanner() {
  const user = useAuthStore((state) => state.user);

  if (!user || user.isConfigured || (user.personalConfigured && user.signatureConfigured)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" />
        Es requerido configurar tu usuario
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {!user.personalConfigured && (
          <Link
            href="/personal-documents#personal-info"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Completa tu información personal
          </Link>
        )}
        {!user.signatureConfigured && (
          <Link
            href="/personal-documents#signature-documents"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Configura tu firma
          </Link>
        )}
      </div>
    </div>
  );
}
