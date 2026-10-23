import {
  MAX_DOCUMENT_CREDITS_PER_PURCHASE,
  documentCreditPurchaseSchema,
} from './_schemas';

/**
 * Valida una compra con la cantidad tal como la entregaría el input.
 *
 * @param quantity - Valor crudo del campo de cantidad.
 * @returns El resultado de `safeParse`.
 *
 * @example
 * parse('5').success; // true
 */
function parse(quantity: unknown) {
  return documentCreditPurchaseSchema.safeParse({
    catalogPriceId: 'precio-1',
    quantity,
  });
}

describe('documentCreditPurchaseSchema', () => {
  it('fija el máximo inicial en 100 documentos', () => {
    expect(MAX_DOCUMENT_CREDITS_PER_PURCHASE).toBe(100);
  });

  /** El input entrega texto; lo que sale hacia el endpoint tiene que ser un número. */
  it('transforma el texto del input en número', () => {
    const result = parse('5');

    expect(result.success).toBe(true);
    expect(result.data?.quantity).toBe(5);
    expect(typeof result.data?.quantity).toBe('number');
  });

  it.each([
    ['una sola unidad', '1', 1],
    ['el máximo permitido', '100', 100],
  ])('acepta %s', (_caso, input, expected) => {
    expect(parse(input).data?.quantity).toBe(expected);
  });

  it.each([
    ['vacía', '', 'Debes seleccionar al menos un documento.'],
    ['cero', '0', 'Debes seleccionar al menos un documento.'],
    ['negativa', '-1', 'Debes seleccionar al menos un documento.'],
    ['decimal', '2.5', 'La cantidad debe ser un número entero.'],
    ['mayor al máximo', '101', 'Puedes comprar máximo 100 documentos.'],
  ])('rechaza una cantidad %s', (_caso, input, message) => {
    const result = parse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
    expect(result.error?.issues[0].path).toEqual(['quantity']);
  });

  it('exige elegir un paquete', () => {
    const result = documentCreditPurchaseSchema.safeParse({
      catalogPriceId: '',
      quantity: 1,
    });

    expect(result.error?.issues[0].message).toBe(
      'Selecciona un paquete de documentos.',
    );
  });

  /** El submit sólo puede mandar `catalogPriceId` y `quantity`: el esquema descarta lo demás. */
  it('descarta cualquier campo de más', () => {
    const result = documentCreditPurchaseSchema.safeParse({
      catalogPriceId: 'precio-1',
      quantity: '3',
      amount: 1,
    });

    expect(result.data).toEqual({ catalogPriceId: 'precio-1', quantity: 3 });
  });
});
