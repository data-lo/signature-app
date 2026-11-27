'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Files, Plus, ScanFace } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  biometricAvailabilityLabel,
  shouldShowBiometricCredits,
} from '@/lib/biometric-credits';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { cn } from '@/lib/utils';
import { BUY_DOCUMENTS_LABEL } from '@/app/dashboard/subscriptions/_utils/purchase-labels';

/**
 * Mismo rótulo que la acción de compra de Suscripciones, a la que lleva este botón: una sola
 * forma de nombrar la compra en toda la app.
 */
export const ADD_DOCUMENTS_LABEL = BUY_DOCUMENTS_LABEL;
export const SUBSCRIPTIONS_ROUTE = '/dashboard/subscriptions';

export function availabilityLabel(credits: number): string {
  if (credits === 0) {
    return 'Sin documentos disponibles';
  }

  if (credits === 1) {
    return '1 documento';
  }

  return `${credits} documentos`;
}

export default function DocumentsAvailability() {
  const { data: billing } = useBillingAccess();
  /**
   * En la propia pantalla de Suscripciones el botón se calla: sólo navegaría a donde ya se está,
   * y la compra tiene ahí su acción primaria.
   */
  const onSubscriptions = usePathname() === SUBSCRIPTIONS_ROUTE;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0 sm:flex-nowrap">
      {billing && (
        <Badge
          variant={'secondary'}
          className="h-8 bg-primary/10 px-2 text-primary"
        >
          <Files />
          {availabilityLabel(billing.credits.document.available)}
        </Badge>
      )}

      {billing && shouldShowBiometricCredits(billing) && (
        <Badge
          variant={'secondary'}
          className="h-8 bg-primary/10 px-2 text-primary"
        >
          <ScanFace />
          {biometricAvailabilityLabel(billing.credits.biometric.available)}
        </Badge>
      )}

      {!onSubscriptions && (
        <Link
          href={SUBSCRIPTIONS_ROUTE}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'text-primary hover:bg-primary/10 hover:text-primary',
          )}
        >
          <Plus aria-hidden />
          {ADD_DOCUMENTS_LABEL}
        </Link>
      )}
    </div>
  );
}
