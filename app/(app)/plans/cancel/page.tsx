'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlanCheckoutCancelPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-8 py-16 text-center">
      <XCircle className="size-12 text-destructive" />
      <h1 className="font-heading text-2xl font-medium text-foreground">Suscripción cancelada</h1>
      <p className="text-sm text-muted-foreground">
        No se completó el proceso de pago. Puedes intentarlo de nuevo cuando quieras.
      </p>
      <Button variant="brand" onClick={() => router.push('/plans')}>
        Volver a planes
      </Button>
    </main>
  );
}
