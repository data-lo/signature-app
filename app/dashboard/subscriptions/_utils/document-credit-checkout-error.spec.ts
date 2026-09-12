import {
  CHECKOUT_ERROR_FALLBACK,
  resolveDocumentCreditCheckoutError,
} from './document-credit-checkout-error';

/**
 * Arma un error con la forma de un `AxiosError` que trae respuesta del backend.
 *
 * @param data - Cuerpo de la respuesta de error.
 * @returns Un objeto con `response.data`, que es lo único que lee el traductor.
 *
 * @example
 * withBody({ message: 'x', field: 'quantity' });
 */
function withBody(data: unknown) {
  return { response: { data } };
}

describe('resolveDocumentCreditCheckoutError', () => {
  it('asocia con la cantidad el rechazo que trae field: quantity', () => {
    expect(
      resolveDocumentCreditCheckoutError(
        withBody({
          statusCode: 400,
          message: 'Puedes comprar máximo 100 documentos.',
          field: 'quantity',
          maxQuantity: 100,
        }),
      ),
    ).toEqual({
      field: 'quantity',
      message: 'Puedes comprar máximo 100 documentos.',
    });
  });

  it('deja el rechazo de la oferta como error general, con el mensaje del backend', () => {
    expect(
      resolveDocumentCreditCheckoutError(
        withBody({
          statusCode: 404,
          message: 'El paquete de documentos seleccionado no está disponible.',
        }),
      ),
    ).toEqual({
      field: null,
      message: 'El paquete de documentos seleccionado no está disponible.',
    });
  });

  /** Un rechazo del `ValidationPipe` trae una lista sin campo: se muestra el primero, sin campo. */
  it('toma el primer mensaje de una lista del ValidationPipe', () => {
    expect(
      resolveDocumentCreditCheckoutError(
        withBody({ message: ['La cantidad debe ser un número.'] }),
      ),
    ).toEqual({ field: null, message: 'La cantidad debe ser un número.' });
  });

  it.each([
    ['sin respuesta (caída de red)', new Error('Network Error')],
    ['con un mensaje vacío', withBody({ message: '  ' })],
    ['nulo', null],
  ])('usa el mensaje genérico con un error %s', (_caso, error) => {
    expect(resolveDocumentCreditCheckoutError(error)).toEqual({
      field: null,
      message: CHECKOUT_ERROR_FALLBACK,
    });
  });
});
