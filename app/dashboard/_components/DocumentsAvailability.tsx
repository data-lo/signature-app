'use client';

import Link from 'next/link';
import { Files, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { cn } from '@/lib/utils';

export const ADD_DOCUMENTS_LABEL = 'Agregar documentos';
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

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0 sm:flex-nowrap">
      {billing && (
        <Badge variant={"secondary"} className="h-8 bg-primary/10 px-2 text-primary">
          <Files />
          {availabilityLabel(billing.creditsAvailable)}
        </Badge>
      )}

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
    </div>
  );
}
