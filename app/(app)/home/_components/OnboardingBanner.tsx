'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useOnboardingStore } from '@/lib/store/useOnboardingStore';

export default function OnboardingBanner() {
  const { isConfigured, personalConfigured, signatureConfigured } =
    useOnboardingStore();

  if (isConfigured || (personalConfigured && signatureConfigured)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" />
        Es requerido configurar tu usuario
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {!personalConfigured && (
          <Link
            href="/personal-documents"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Completa tu información personal
          </Link>
        )}
        {!signatureConfigured && (
          <Link
            href="/personal-documents"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Configura tu firma
          </Link>
        )}
      </div>
    </div>
  );
}
