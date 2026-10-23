'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { formatPeriodEnd } from '../_utils/format-period-end';

interface CancelSubscriptionDialogProps {
  /** Fin del periodo pagado: hasta cuándo seguirá habiendo servicio. */
  currentPeriodEnd: string | null;
  onConfirm: () => void;
  /** Hay una operación de facturación en curso; no se abre otra encima. */
  disabled?: boolean;
}

/**
 * Confirmación de la baja.
 *
 * **El modal no es un trámite.** Cancelar no se deshace solo —hay que reanudar a propósito— y el
 * clic está a un pixel del resto de la tarjeta, así que la confirmación existe para que nadie se
 * dé de baja sin querer. Por eso el texto dice lo que de verdad va a pasar, incluida la parte
 * tranquilizadora: que NO se pierde el tiempo ya pagado.
 *
 * **Es presentacional: no llama a nada.** La mutación vive en la tarjeta, y no por gusto. Con
 * `AlertDialogAction` —que es un `Close` del primitivo— el diálogo se cierra en cuanto se pulsa,
 * así que un error del proveedor se quedaría sin ningún sitio donde contarse si el estado de la
 * llamada viviera aquí dentro. Subiéndolo a la tarjeta, el modal desaparece al confirmar y el
 * "cancelando…" y el posible fallo se muestran donde el usuario sigue mirando.
 */
export default function CancelSubscriptionDialog({
  currentPeriodEnd,
  onConfirm,
  disabled = false,
}: CancelSubscriptionDialogProps) {
  const fechaTermino = formatPeriodEnd(currentPeriodEnd);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" />}
        disabled={disabled}
      >
        Cancelar suscripción
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar tu suscripción?</AlertDialogTitle>
          <AlertDialogDescription
            render={<div />}
            className="flex flex-col gap-2"
          >
            <p>
              {fechaTermino
                ? `Tu plan seguirá activo hasta el ${fechaTermino}. No se renovará automáticamente y no se te volverá a cobrar.`
                : 'Tu plan seguirá activo hasta el final del periodo que ya pagaste. No se renovará automáticamente y no se te volverá a cobrar.'}
            </p>
            <p>
              Conservas todo lo que incluye tu plan —y los documentos que ya
              tienes disponibles— hasta esa fecha. Puedes reanudarla mientras el
              periodo siga vigente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Conservar mi plan</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Sí, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
