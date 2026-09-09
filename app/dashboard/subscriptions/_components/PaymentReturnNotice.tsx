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
 * Los de `?purchase=`, que usa la compra de documentos sueltos.
 *
 * **Parámetro propio y no el de la suscripción, a propósito.** Las dos vueltas esperan cosas
 * distintas —allí que el plan se active, aquí que suba el saldo— y compartirlo haría que comprar
 * documentos con un plan ya activo anunciara "Suscripción activa", que es cierto y no tiene nada
 * que ver con lo que el usuario acaba de hacer.
 */
const PURCHASE_CREDITS = 'credits';
const PURCHASE_CANCEL = 'cancel';

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
  const purchase = searchParams.get('purchase');
  const isReturningFromPayment = payment === PAYMENT_SUCCESS;
  const isReturningFromCreditsPurchase = purchase === PURCHASE_CREDITS;

  const invalidarEstado = useInvalidateBillingAccess();
  const { data: billing } = useBillingAccess({
    awaitActivation: isReturningFromPayment,
    awaitCredits: isReturningFromCreditsPurchase,
  });

  /** Lo cacheado se pidió antes de ir a pagar: describe el estado anterior a la compra. */
  useEffect(() => {
    if (!isReturningFromPayment && !isReturningFromCreditsPurchase) {
      return;
    }

    void invalidarEstado();
  }, [
    isReturningFromPayment,
    isReturningFromCreditsPurchase,
    invalidarEstado,
  ]);

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

  /**
   * Compra de documentos. **No se afirma que el saldo ya esté acreditado**: quien lo confirma es
   * el webhook, y desde aquí no hay forma de distinguir "ya llegó" de "todavía no" —el saldo es
   * un número y el valor anterior a la compra se perdió al recargar la página de vuelta de
   * Stripe—. Así que se dice lo único que sí consta: que el pago se recibió. El número de
   * documentos que muestra la tarjeta de abajo es siempre el real, y sube solo en cuanto el
   * webhook acredita, porque la consulta sigue insistiendo durante el plazo.
   */
  if (isReturningFromCreditsPurchase) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            Pago recibido
          </CardTitle>
          <CardDescription>
            Estamos confirmando tu compra. En cuanto el proveedor nos avise, tus
            documentos aparecerán en el saldo de aquí abajo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (purchase === PURCHASE_CANCEL) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5 text-muted-foreground" />
            Compra cancelada
          </CardTitle>
          <CardDescription>
            La compra fue cancelada y no se realizó ningún cargo. Tus documentos
            y tu plan siguen igual.
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
