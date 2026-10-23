'use client';

import { useController, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Form } from '@/components/form/form';
import { FormInput } from '@/components/form/form-input';
import { formatAmount } from '@/lib/format-currency';
import { useCreateDocumentCreditCheckout } from '../_hooks/useCreateDocumentCreditCheckout';
import {
  MAX_DOCUMENT_CREDITS_PER_PURCHASE,
  documentCreditPurchaseSchema,
  type DocumentCreditPurchaseFormInput,
  type DocumentCreditPurchaseFormValues,
} from '../_schemas';
import { resolveDocumentCreditCheckoutError } from '../_utils/document-credit-checkout-error';
import type { DocumentCreditOffer } from '../_interfaces/document-credit-offer.interface';

/**
 * Rotula una cantidad de documentos en singular o plural.
 *
 * Un "1 documentos" delata que nadie miró la pantalla, y es justo el paquete más común del plan
 * gratuito.
 *
 * @param documents - Cantidad de documentos a rotular.
 * @returns El texto listo para pintar.
 *
 * @example
 * ```ts
 * documentsLabel(1); // "1 documento"
 * documentsLabel(10); // "10 documentos"
 * ```
 */
function documentsLabel(documents: number): string {
  return documents === 1 ? '1 documento' : `${documents} documentos`;
}

/**
 * Pinta una oferta seleccionable, igual esté sola o acompañada.
 *
 * @param props.offer - Oferta del catálogo local.
 * @param props.selected - Si es la oferta elegida en el formulario.
 * @param props.disabled - Bloquea la elección mientras se abre el pago.
 * @param props.onSelect - Marca esta oferta como la elegida.
 * @returns El botón de la oferta.
 *
 * @example
 * ```tsx
 * <SelectableOffer offer={offer} selected disabled={false} onSelect={() => {}} />
 * ```
 */
function SelectableOffer({
  offer,
  selected,
  disabled,
  onSelect,
}: {
  offer: DocumentCreditOffer;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-baseline justify-between gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
      }`}
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {offer.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {documentsLabel(offer.documentsGranted)}
        </span>
      </span>
      <span className="font-heading text-lg font-medium text-foreground">
        {formatAmount(offer.amount, offer.currency)}
      </span>
    </button>
  );
}

/**
 * Formulario de compra de documentos sueltos: qué oferta, cuántas unidades y el total a pagar.
 *
 * **La cantidad se elige aquí y queda bloqueada en Stripe.** El Checkout se abre con el Price de la
 * oferta por la cantidad elegida, sin dejar que se cambie allá; por eso el total que se muestra es
 * el que se cobra. El total es sólo informativo: el backend lo vuelve a calcular desde su catálogo
 * y nunca recibe un importe de esta pantalla.
 *
 * **El botón de pago se habilita con el esquema y no con `formState.isValid`.** `setError` fuerza
 * `isValid` a `false` hasta la siguiente validación, así que un fallo pasajero del proveedor dejaría
 * el botón muerto sin que el usuario pudiera reintentar. Con el esquema, un error de CAMPO —del
 * formulario o del backend— bloquea el envío hasta que se corrige, y un error de la compra en
 * general (`root.serverError`) se muestra sin impedir reintentar.
 *
 * Si el backend rechaza la cantidad, el error se asocia con el campo mediante
 * `setError('quantity', ...)` y se pinta debajo del selector; cualquier otro rechazo va a
 * `root.serverError`. En ninguno de los dos casos se redirige a Stripe.
 *
 * @param props.offers - Ofertas que la cuenta activa puede comprar; al menos una.
 * @returns El formulario, con el pie del diálogo y su botón de pago.
 *
 * @example
 * ```tsx
 * <DocumentCreditPurchaseForm offers={offers} />
 * ```
 */
export default function DocumentCreditPurchaseForm({
  offers,
}: {
  offers: DocumentCreditOffer[];
}) {
  const checkout = useCreateDocumentCreditCheckout();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<
    DocumentCreditPurchaseFormInput,
    unknown,
    DocumentCreditPurchaseFormValues
  >({
    resolver: zodResolver(documentCreditPurchaseSchema),
    mode: 'onChange',
    defaultValues: {
      // Con una sola oferta no hay nada que elegir: se preselecciona para que comprar sea un clic.
      catalogPriceId: offers.length === 1 ? offers[0].catalogPriceId : '',
      quantity: 1,
    },
  });

  const { field: offerField, fieldState: offerFieldState } = useController({
    control,
    name: 'catalogPriceId',
  });

  const values = useWatch({ control });
  const selectedOffer = offers.find(
    (offer) => offer.catalogPriceId === values.catalogPriceId,
  );
  const parsedQuantity = documentCreditPurchaseSchema.shape.quantity.safeParse(
    values.quantity,
  );
  const quantity = parsedQuantity.success ? parsedQuantity.data : null;

  // Tras abrir la sesión el navegador se va a Stripe: el botón no debe volver a habilitarse.
  const isRedirecting = checkout.isSuccess;
  const isBusy = isSubmitting || isRedirecting;
  const hasFieldErrors = Boolean(errors.catalogPriceId || errors.quantity);
  const canSubmit =
    documentCreditPurchaseSchema.safeParse(values).success &&
    !hasFieldErrors &&
    !isBusy;

  /**
   * Abre el Checkout con la oferta y la cantidad ya validadas y transformadas por el esquema.
   *
   * Captura el rechazo de la petición en vez de dejarlo escapar: un error de cantidad se asocia
   * con su campo y cualquier otro va a `root.serverError`. En los dos casos el hook no llega a su
   * `onSuccess`, así que no se redirige a Stripe.
   *
   * @param formValues - Valores de salida del esquema: `quantity` ya es un número entero.
   * @returns Nada; si el backend acepta, el hook redirige a Stripe.
   *
   * @example
   * ```tsx
   * <Form onSubmit={handleSubmit(submitPurchase)} />
   * ```
   */
  async function submitPurchase(formValues: DocumentCreditPurchaseFormValues) {
    try {
      await checkout.mutateAsync({
        catalogPriceId: formValues.catalogPriceId,
        quantity: formValues.quantity,
      });
    } catch (error) {
      const serverError = resolveDocumentCreditCheckoutError(error);

      if (serverError.field === 'quantity') {
        setError(
          'quantity',
          { type: 'server', message: serverError.message },
          { shouldFocus: true },
        );
        return;
      }

      setError('root.serverError', {
        type: 'server',
        message: serverError.message,
      });
    }
  }

  return (
    <Form
      onSubmit={handleSubmit(submitPurchase)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        {offers.map((offer) => (
          <SelectableOffer
            key={offer.catalogPriceId}
            offer={offer}
            selected={offerField.value === offer.catalogPriceId}
            disabled={isBusy}
            onSelect={() => offerField.onChange(offer.catalogPriceId)}
          />
        ))}
        {offerFieldState.error ? (
          <p className="text-sm text-destructive">
            {offerFieldState.error.message}
          </p>
        ) : null}
      </div>

      <FieldGroup>
        <FormInput
          control={control}
          name="quantity"
          id="document-credit-quantity"
          label="Cantidad"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DOCUMENT_CREDITS_PER_PURCHASE}
          step={1}
          required
          disabled={isBusy}
          description={`Puedes comprar de 1 a ${MAX_DOCUMENT_CREDITS_PER_PURCHASE} a la vez.`}
        />
      </FieldGroup>

      {selectedOffer ? (
        <dl
          aria-label="Resumen de la compra"
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg bg-muted/50 p-3 text-sm"
        >
          <dt className="text-muted-foreground">Precio unitario</dt>
          <dd className="text-right text-foreground">
            {formatAmount(selectedOffer.amount, selectedOffer.currency)}
          </dd>
          <dt className="text-muted-foreground">Cantidad</dt>
          <dd className="text-right text-foreground">{quantity ?? '—'}</dd>
          <dt className="text-muted-foreground">Recibirás</dt>
          <dd className="text-right text-foreground">
            {quantity === null
              ? '—'
              : documentsLabel(selectedOffer.documentsGranted * quantity)}
          </dd>
          <dt className="font-medium text-foreground">Total</dt>
          <dd className="text-right font-heading text-lg font-medium text-foreground">
            {quantity === null
              ? '—'
              : formatAmount(
                  selectedOffer.amount * quantity,
                  selectedOffer.currency,
                )}
          </dd>
        </dl>
      ) : null}

      {/**
       * El error de la compra se dibuja AQUÍ y no en un error boundary: quien está comprando tiene
       * el diálogo abierto y el contexto delante, y llevárselo por una sesión que no pudo abrirse
       * —sin haber cobrado nada— le haría perder de vista lo que intentaba hacer.
       */}
      {errors.root?.serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.serverError.message}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" variant="brand" disabled={!canSubmit}>
          {isBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Redirigiendo a Stripe...
            </>
          ) : (
            'Continuar al pago'
          )}
        </Button>
      </DialogFooter>
    </Form>
  );
}
