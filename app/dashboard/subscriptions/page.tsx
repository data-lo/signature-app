import { Suspense } from 'react';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import PaymentReturnNotice from './_components/PaymentReturnNotice';
import SubscriptionStateCard from './_components/SubscriptionStateCard';

/**
 * Pantalla de suscripciones, y destino del retorno desde Stripe Checkout.
 *
 * `PaymentReturnNotice` va dentro de un `Suspense` porque lee la query string con
 * `useSearchParams`, y sin ese límite Next obliga a renderizar toda la ruta del lado del
 * cliente. El aviso es lo único que depende de la URL; el estado de la suscripción no.
 */
export default function SubscriptionsPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-medium text-foreground">
            Suscripciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta el estado de tu plan y lo que incluye.
          </p>
        </div>

        <Suspense fallback={null}>
          <PaymentReturnNotice />
        </Suspense>

        <SubscriptionStateCard />
      </div>
    </PageContainer>
  );
}
