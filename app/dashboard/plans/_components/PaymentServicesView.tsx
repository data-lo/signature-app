'use client';

import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { usePaymentServices } from '../_hooks/usePaymentServices';
import { useCreateCheckoutSession } from '../_hooks/useCreateCheckoutSession';
import { isCurrentPlan, isSubscriptionPlan } from '../_utils/current-plan';
import PaymentServiceCard from './PaymentServiceCard';
import PaymentServicesSkeleton from './PaymentServicesSkeleton';

/**
 * Catálogo de servicios.
 *
 * No hay rama de error para el catálogo: tanto la consulta como la mutación usan `throwOnError`,
 * así que un fallo sube al error boundary del segmento (`error.tsx`). Eso es lo que garantiza que
 * nunca se vean tarjetas a medias junto a un aviso de error.
 *
 * **Con una suscripción activa no se puede contratar otro plan.** No es una regla de esta
 * pantalla: `CreateSubscriptionCheckoutUseCase` rechaza con 409 cualquier checkout sobre un
 * perfil `ACTIVE` —incluido uno con la baja ya programada, que sigue `ACTIVE` hasta terminar el
 * periodo—. Ofrecer el botón sería mandar al usuario a Stripe para que vuelva con un error, así
 * que se deshabilita aquí y se explica por qué.
 *
 * **El plan contratado también se deshabilita**, no sólo "los demás": el backend lo rechaza con
 * el mismo 409, y volver a ofrecer "Comprar" en la tarjeta que ya lleva el badge "Plan actual"
 * sería invitar a pagar dos veces por lo mismo.
 */
export default function PaymentServicesView() {
  const { data: services, isPending } = usePaymentServices();
  /**
   * Comparte `queryKey` con la consulta que `AuthProvider` ya monta, así que esto no dispara una
   * petición extra: sólo se suscribe al mismo dato. Se monta el hook en vez de leer el espejo del
   * store (`useKnownBillingAccess`) porque acá hace falta saber si el estado TODAVÍA no llegó, y
   * el espejo no distingue eso de "no tiene plan".
   */
  const { data: billing, isLoading: isBillingLoading } = useBillingAccess();

  const checkoutMutation = useCreateCheckoutSession();

  /**
   * Se espera también al estado de facturación, y no sólo al catálogo: dibujar las tarjetas antes
   * dejaría los botones habilitados durante un instante, y ese instante alcanza para un clic que
   * termina en el 409 del backend. El esqueleto ya estaba ahí para el catálogo; extenderlo es más
   * barato que un bloqueo que llega tarde.
   *
   * `isLoading` y NO `isPending`: sin cuenta activa la consulta queda deshabilitada (ver
   * `useBillingAccess`), y una consulta deshabilitada es `isPending` para siempre — esperarla
   * dejaría el esqueleto girando eternamente en cuanto el tenant no esté resuelto. `isLoading`
   * sólo es cierto mientras se está trayendo el dato de verdad.
   */
  if (isPending || isBillingLoading) {
    return <PaymentServicesSkeleton />;
  }

  if (!services?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay servicios disponibles para contratar.
      </p>
    );
  }

  /**
   * La pregunta que decide todo, tal como la define el contrato: `hasActiveSubscription`. No se
   * deduce del `status` ni del nombre del plan —un perfil con la baja programada sigue activo, y
   * el plan gratuito no lo está— porque el backend ya resolvió esa distinción en un solo campo.
   *
   * Si el estado no se pudo cargar, `billing` queda `undefined` y no se bloquea nada: ante un
   * fallo de esta consulta es preferible dejar contratar —el backend sigue rechazando con 409 lo
   * que no corresponde— que impedirle comprar a quien no tiene ningún plan.
   */
  const hasActiveSubscription = billing?.hasActiveSubscription === true;

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
          isCurrentPlan={isCurrentPlan(service, billing)}
          /**
           * Sólo los planes. Una compra suelta —un paquete de créditos de documentos— se puede
           * hacer con o sin suscripción: tener un plan no es motivo para no dejar comprar más
           * documentos, es justamente lo contrario.
           */
          isBlockedByActiveSubscription={
            hasActiveSubscription && isSubscriptionPlan(service)
          }
          onBuy={(priceId) => checkoutMutation.mutate(priceId)}
        />
      ))}
    </div>
  );
}
