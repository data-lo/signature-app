'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/error-handler';
import { useDocumentCreditOffers } from '../_hooks/useDocumentCreditOffers';
import DocumentCreditPurchaseForm from './DocumentCreditPurchaseForm';

/** Lo que se dice cuando el plan no tiene ningún paquete configurado. */
export const NO_OFFERS_MESSAGE =
  'No hay paquetes de documentos disponibles para tu plan.';

const TRIGGER_LABEL = 'Agregar más documentos';

/**
 * "Agregar más documentos": compra de documentos sueltos desde la sección de suscripción.
 *
 * **Las ofertas se consultan al montar y no al abrir el diálogo**, aunque cueste una petición por
 * visita a esta pantalla. Es lo que permite que el botón sepa de antemano si hay algo que vender:
 * sin ese dato sólo se podría abrir un diálogo para decir que está vacío, y la historia pide
 * justamente lo contrario — que el botón no permita iniciar la compra cuando el plan no tiene
 * paquetes.
 *
 * Qué oferta y cuántas unidades se compran lo decide `DocumentCreditPurchaseForm`. El precio y
 * los documentos de cada oferta vienen del catálogo local: acá no se escribe ninguna cifra, y qué
 * paquetes llegan lo decide el backend según el plan vigente de la cuenta.
 *
 * **Comprar documentos no toca la suscripción**, y por eso el botón convive con un plan activo,
 * con uno gratuito y con una baja ya programada sin ninguna condición extra.
 */
export default function AddDocumentsDialog() {
  const [open, setOpen] = useState(false);
  /**
   * Cada apertura monta un formulario nuevo —cantidad en 1, sin errores de un intento anterior—
   * sin depender de si el diálogo desmonta su contenido al cerrarse.
   */
  const [formKey, setFormKey] = useState(0);

  const { data: offers, isLoading, isError, error } = useDocumentCreditOffers();

  const hasOffers = Boolean(offers?.length);

  /**
   * Mientras se sabe si hay paquetes, el botón se muestra deshabilitado en vez de esconderse: un
   * botón que aparece medio segundo después mueve el resto de la tarjeta bajo el cursor.
   */
  if (isLoading) {
    return (
      <Button type="button" variant="brand" disabled>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {TRIGGER_LABEL}
      </Button>
    );
  }

  /**
   * El plan no tiene paquetes configurados —o no se pudieron cargar—. En los dos casos no hay
   * compra que iniciar, así que el botón queda deshabilitado y explica por qué.
   *
   * El aviso va en `aria-disabled` y NO en `disabled`: un botón `disabled` no recibe eventos de
   * puntero ni foco, así que el tooltip que explica la situación no llegaría a verse nunca y el
   * usuario se quedaría con un botón muerto y sin motivo.
   */
  if (isError || !hasOffers) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="brand"
              aria-disabled={true}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              onClick={(event) => event.preventDefault()}
            >
              <Plus className="size-4" />
              {TRIGGER_LABEL}
            </Button>
          }
        />
        <TooltipContent>
          {isError
            ? getErrorMessage(
                error,
                'No pudimos cargar los paquetes disponibles. Intenta de nuevo en unos minutos.',
              )
            : NO_OFFERS_MESSAGE}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setFormKey((key) => key + 1);
        }
      }}
    >
      <DialogTrigger render={<Button variant="brand" />}>
        <Plus className="size-4" />
        {TRIGGER_LABEL}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TRIGGER_LABEL}</DialogTitle>
          <DialogDescription>
            Elige el paquete y cuántos quieres comprar. No modifica tu plan ni
            tu suscripción.
          </DialogDescription>
        </DialogHeader>

        <DocumentCreditPurchaseForm key={formKey} offers={offers!} />
      </DialogContent>
    </Dialog>
  );
}
