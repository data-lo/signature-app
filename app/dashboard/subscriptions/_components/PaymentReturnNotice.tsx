'use client';

import { CheckCircle2, Info } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Valores que Stripe puede traer de vuelta en `?payment=`. */
const PAYMENT_SUCCESS = 'success';
const PAYMENT_CANCEL = 'cancel';

/**
 * Acuse de recibo del retorno desde Stripe Checkout.
 *
 * **No confirma nada.** El parámetro `?payment=success` sólo dice que el navegador volvió por
 * la `success_url`, y esa URL es manipulable: cualquiera puede escribirla a mano. Por eso el
 * texto habla de "estamos confirmando" y no de "suscripción activa" — quien da el pago por
 * bueno es el webhook firmado, contra la base de datos.
 *
 * Sin parámetro no se dibuja nada: el usuario que entra por el menú no tiene por qué ver un
 * aviso sobre un pago que no acaba de hacer.
 */
export default function PaymentReturnNotice() {
  const searchParams = useSearchParams();
  const payment = searchParams.get('payment');

  if (payment === PAYMENT_SUCCESS) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            Pago recibido
          </CardTitle>
          <CardDescription>
            Estamos confirmando tu suscripción. En cuanto el proveedor nos avise,
            verás el plan activo aquí mismo.
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
            El pago fue cancelado y no se realizó ningún cargo. Puedes intentarlo
            nuevamente cuando quieras.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return null;
}
