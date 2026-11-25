/**
 * Rótulo único de la compra de documentos: el mismo en el botón de la barra superior
 * (`DocumentsAvailability`), en el disparador de `AddDocumentsDialog` y en el título del diálogo.
 * Vive en un módulo propio para que la barra superior no arrastre el diálogo a su bundle.
 *
 * @example
 * ```tsx
 * <Button>{BUY_DOCUMENTS_LABEL}</Button> // "Comprar documentos"
 * ```
 */
export const BUY_DOCUMENTS_LABEL = 'Comprar documentos';
