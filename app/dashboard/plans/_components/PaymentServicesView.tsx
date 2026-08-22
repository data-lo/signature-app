'use client';

import { usePaymentServices } from '../_hooks/usePaymentServices';
import { useCreateCheckoutSession } from '../_hooks/useCreateCheckoutSession';
import PaymentServiceCard from './PaymentServiceCard';
import PaymentServicesSkeleton from './PaymentServicesSkeleton';

/**
 * Catálogo de servicios.
 *
 * No hay rama de error: tanto la consulta como la mutación usan `throwOnError`, así que un
 * fallo sube al error boundary del segmento (`error.tsx`). Eso es lo que garantiza que nunca se
 * vean tarjetas a medias junto a un aviso de error.
 */
export default function PaymentServicesView() {
  const { data: services, isPending } = usePaymentServices();
  const checkoutMutation = useCreateCheckoutSession();

  if (isPending) {
    return <PaymentServicesSkeleton />;
  }

  if (!services?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay servicios disponibles para contratar.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <PaymentServiceCard
          key={service.priceId}
          service={service}
          isSubmitting={
            checkoutMutation.isPending &&
            checkoutMutation.variables === service.priceId
          }
          isAnySubmitting={checkoutMutation.isPending}
          onBuy={(priceId) => checkoutMutation.mutate(priceId)}
        />
      ))}
    </div>
  );
}
