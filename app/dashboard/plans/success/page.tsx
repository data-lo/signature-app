'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PlanCheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-8 py-16 text-center">
      <CheckCircle2 className="size-12 text-emerald-500" />
      <h1 className="font-heading text-2xl font-medium text-foreground">¡Suscripción exitosa!</h1>
      <p className="text-sm text-muted-foreground">
        Tu pago se procesó correctamente y tu plan quedará activo en cuanto Stripe confirme la
        facturación.
        {sessionId && (
          <>
            {' '}
            <span className="block text-xs text-muted-foreground/70">Sesión: {sessionId}</span>
          </>
        )}
      </p>
      <Button
        variant="brand"
        onClick={() => router.push('/dashboard/documents/create')}
      >
        Ir al inicio
      </Button>
    </main>
  );
}

export default function PlanCheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PlanCheckoutSuccessContent />
    </Suspense>
  );
}
