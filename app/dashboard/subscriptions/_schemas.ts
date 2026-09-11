import { z } from 'zod';

/**
 * Máximo de unidades de una oferta que se pueden comprar en un solo Checkout.
 *
 * Copia de `MAX_DOCUMENT_CREDITS_PER_PURCHASE` en signature-server, sólo para avisar antes de
 * enviar. **La que decide es la del backend**: si alguna vez difieren, el backend responde con
 * `field: 'quantity'` y el formulario muestra su mensaje en el mismo sitio.
 */
export const MAX_DOCUMENT_CREDITS_PER_PURCHASE = 100;

/**
 * Compra de documentos sueltos: qué oferta y cuántas unidades.
 *
 * `quantity` se valida con `z.coerce.number()` porque el `<input type="number">` entrega TEXTO:
 * la coerción es lo que transforma `"5"` en `5` antes de que `handleSubmit` entregue los valores,
 * y lo que hace que un campo vacío llegue como `0` y caiga en el mínimo en vez de pasar como
 * válido. Los mensajes son los mismos que responde el backend.
 */
export const documentCreditPurchaseSchema = z.object({
  catalogPriceId: z.string().min(1, 'Selecciona un paquete de documentos.'),
  quantity: z.coerce
    .number({ error: 'Ingresa una cantidad válida.' })
    .int('La cantidad debe ser un número entero.')
    .min(1, 'Debes seleccionar al menos un documento.')
    .max(
      MAX_DOCUMENT_CREDITS_PER_PURCHASE,
      `Puedes comprar máximo ${MAX_DOCUMENT_CREDITS_PER_PURCHASE} documentos.`,
    ),
});

/** Valores tal como viven en el formulario: la cantidad puede ser texto mientras se escribe. */
export type DocumentCreditPurchaseFormInput = z.input<
  typeof documentCreditPurchaseSchema
>;

/** Valores ya validados y transformados: la cantidad es un número entero. */
export type DocumentCreditPurchaseFormValues = z.output<
  typeof documentCreditPurchaseSchema
>;
