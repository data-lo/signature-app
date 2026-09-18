import { Suspense } from 'react';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';
import PaymentReturnNotice from './_components/PaymentReturnNotice';
import SubscriptionStateCard from './_components/SubscriptionStateCard';

/**
 * Pantalla de suscripciones, y destino del retorno desde Stripe Checkout.
 *
 * `PaymentReturnNotice` va dentro de un `Suspense` porque lee la query string con
 * `useSearchParams`, y sin ese límite Next obliga a renderizar toda la ruta del lado del
 * cliente. El aviso es lo único que depende de la URL; el estado de la suscripción no.
 *
 * Exige `BILLING.READ`. Administrar el plan —cancelar, reanudar, comprar documentos— pide además
 * `BILLING.MANAGE`, que se decide dentro de la pantalla y lo vuelve a validar cada endpoint.
 */
export default async function SubscriptionsPage() {
  await assertPagePermission('BILLING.READ');

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
