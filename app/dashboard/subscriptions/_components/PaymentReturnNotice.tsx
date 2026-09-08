'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { useInvalidateBillingAccess } from '../_hooks/useInvalidateBillingAccess';

/** Valores que Stripe puede traer de vuelta en `?payment=`. */
const PAYMENT_SUCCESS = 'success';
const PAYMENT_CANCEL = 'cancel';

/**
 * Acuse de recibo del retorno desde Stripe Checkout.
 *
 * **El parámetro no confirma nada.** `?payment=success` sólo dice que el navegador volvió por la
 * `success_url`, y esa URL es manipulable: cualquiera puede escribirla a mano. Quien da el pago
 * por bueno es el webhook firmado, contra la base de datos.
 *
 * Por eso este componente, además de dibujar el aviso, es el que pide el estado insistiendo:
 * invalida lo que hubiera en caché —viene de antes de pagar, así que está viejo por definición—
 * y deja la consulta reintentando hasta que el webhook active la suscripción o se agote el plazo.
 *
 * Se invalida `billingAccess`, que es la consulta única del perfil: la comparten esta pantalla y
 * el estado global que alimenta al resto de la aplicación (`AuthProvider`), así que refrescarla
 * los pone al día a la vez. Antes eran dos consultas del mismo perfil y había que acordarse de
 * invalidar las dos.
 *
 * Sin parámetro no se dibuja nada ni se insiste: quien entra por el menú no acaba de pagar.
 */
export default function PaymentReturnNotice() {
  const searchParams = useSearchParams();
  const payment = searchParams.get('payment');
  const isReturningFromPayment = payment === PAYMENT_SUCCESS;

  const invalidarEstado = useInvalidateBillingAccess();
  const { data: billing } = useBillingAccess({
    awaitActivation: isReturningFromPayment,
  });

  /** Lo cacheado se pidió antes de ir a pagar: describe el estado anterior a la compra. */
  useEffect(() => {
    if (!isReturningFromPayment) {
      return;
    }

    void invalidarEstado();
  }, [isReturningFromPayment, invalidarEstado]);

  const yaEstaActiva = billing?.hasActiveSubscription ?? false;

  if (isReturningFromPayment) {
    if (yaEstaActiva) {
      return (
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              Suscripción activa
            </CardTitle>
            <CardDescription>
              Tu pago quedó confirmado y tu plan ya está disponible.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className="border-emerald-500/50 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-emerald-600 dark:text-emerald-400" />
            Pago recibido
          </CardTitle>
          <CardDescription>
            Estamos confirmando tu suscripción. En cuanto el proveedor nos
            avise, verás el plan activo aquí mismo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (payment === PAYMENT_CANCEL) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5 text-muted-foreground" />
            Pago cancelado
          </CardTitle>
          <CardDescription>
            El pago fue cancelado y no se realizó ningún cargo. Puedes
            intentarlo nuevamente cuando quieras.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return null;
}
