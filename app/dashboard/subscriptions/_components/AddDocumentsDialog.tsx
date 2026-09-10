'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { formatAmount } from '@/lib/format-currency';
import { getErrorMessage } from '@/lib/error-handler';
import { useDocumentCreditOffers } from '../_hooks/useDocumentCreditOffers';
import { useCreateDocumentCreditCheckout } from '../_hooks/useCreateDocumentCreditCheckout';
import type { DocumentCreditOffer } from '../_interfaces/document-credit-offer.interface';

/** Lo que se dice cuando el plan no tiene ningún paquete configurado. */
export const SIN_PAQUETES =
  'No hay paquetes de documentos disponibles para tu plan.';

const ETIQUETA_BOTON = 'Agregar más documentos';

/**
 * Documentos de un paquete, en singular o plural. Un "1 documentos" delata que nadie miró la
 * pantalla, y es justo el paquete más común del plan gratuito.
 */
function etiquetaDeDocumentos(documentsGranted: number): string {
  return documentsGranted === 1
    ? '1 documento'
    : `${documentsGranted} documentos`;
}

/** Una oferta, pintada igual esté sola o acompañada. */
function OfertaSeleccionable({
  offer,
  seleccionada,
  disabled,
  onSelect,
}: {
  offer: DocumentCreditOffer;
  seleccionada: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={seleccionada}
      className={`flex w-full items-baseline justify-between gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
        seleccionada
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted'
      }`}
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {offer.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {etiquetaDeDocumentos(offer.documentsGranted)}
        </span>
      </span>
      <span className="font-heading text-lg font-medium text-foreground">
        {formatAmount(offer.amount, offer.currency)}
      </span>
    </button>
  );
}

/**
 * "Agregar más documentos": compra de documentos sueltos desde la sección de suscripción.
 *
 * **Las ofertas se consultan al montar y no al abrir el diálogo**, aunque cueste una petición por
 * visita a esta pantalla. Es lo que permite que el botón sepa de antemano si hay algo que vender:
 * sin ese dato sólo se podría abrir un diálogo para decir que está vacío, y la historia pide
 * justamente lo contrario — que el botón no permita iniciar la compra cuando el plan no tiene
 * paquetes.
 *
 * El precio y la cantidad de documentos vienen del catálogo local: acá no se escribe ninguna
 * cifra. Qué paquetes llegan lo decide el backend según el plan vigente de la cuenta, así que
 * esta pantalla no filtra nada ni conoce los planes — cambiar la tarifa de Plus no toca este
 * archivo.
 *
 * **Comprar documentos no toca la suscripción**, y por eso el botón convive con un plan activo,
 * con uno gratuito y con una baja ya programada sin ninguna condición extra.
 */
export default function AddDocumentsDialog() {
  const [abierto, setAbierto] = useState(false);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const { data: offers, isLoading, isError, error } = useDocumentCreditOffers();

  const checkout = useCreateDocumentCreditCheckout();

  /**
   * Con una sola oferta no hay nada que elegir: se preselecciona para que comprar sea un clic.
   * Con varias, `seleccionada` manda y el botón espera a que el usuario decida.
   */
  const unica = offers?.length === 1 ? offers[0] : undefined;
  const elegida =
    offers?.find((offer) => offer.catalogPriceId === seleccionada) ?? unica;

  const hayOfertas = Boolean(offers?.length);

  /**
   * Mientras se sabe si hay paquetes, el botón se muestra deshabilitado en vez de esconderse: un
   * botón que aparece medio segundo después mueve el resto de la tarjeta bajo el cursor.
   */
  if (isLoading) {
    return (
      <Button type="button" variant="brand" disabled>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {ETIQUETA_BOTON}
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
  if (isError || !hayOfertas) {
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
              {ETIQUETA_BOTON}
            </Button>
          }
        />
        <TooltipContent>
          {isError
            ? getErrorMessage(
                error,
                'No pudimos cargar los paquetes disponibles. Intenta de nuevo en unos minutos.',
              )
            : SIN_PAQUETES}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        setAbierto(open);
        if (!open) {
          setSeleccionada(null);
          checkout.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="brand" />}>
        <Plus className="size-4" />
        {ETIQUETA_BOTON}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ETIQUETA_BOTON}</DialogTitle>
          <DialogDescription>
            Compra documentos sueltos para tu cuenta. No modifica tu plan ni tu
            suscripción.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {offers!.map((offer) => (
            <OfertaSeleccionable
              key={offer.catalogPriceId}
              offer={offer}
              seleccionada={elegida?.catalogPriceId === offer.catalogPriceId}
              disabled={checkout.isPending}
              onSelect={() => setSeleccionada(offer.catalogPriceId)}
            />
          ))}
        </div>

        {/**
         * El error de la compra se dibuja AQUÍ y no en un error boundary: quien está comprando
         * tiene el diálogo abierto y el contexto delante, y llevárselo por una sesión que no
         * pudo abrirse —sin haber cobrado nada— le haría perder de vista lo que intentaba hacer.
         */}
        {checkout.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(
              checkout.error,
              'No pudimos abrir el pago. Intenta de nuevo en unos minutos.',
            )}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="brand"
            disabled={!elegida || checkout.isPending}
            onClick={() => {
              if (elegida) {
                checkout.mutate(elegida.catalogPriceId);
              }
            }}
          >
            {checkout.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirigiendo a Stripe...
              </>
            ) : (
              'Continuar al pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
