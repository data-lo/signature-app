import { AxiosError, type AxiosResponse } from 'axios';
import { retryDocumentLoad, toDocumentLoadErrorKind } from './_errors';

function httpError(status: number) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data: {},
    } as AxiosResponse,
  );
}

describe('toDocumentLoadErrorKind', () => {
  it.each([
    [403, 'forbidden'],
    [404, 'not-found'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ])('clasifica un %s como %s', (status, expected) => {
    expect(toDocumentLoadErrorKind(httpError(status))).toBe(expected);
  });

  it('trata como no disponible un error sin respuesta o que no es de axios', () => {
    expect(toDocumentLoadErrorKind(new AxiosError('Network Error'))).toBe(
      'unavailable',
    );
    expect(toDocumentLoadErrorKind(new Error('boom'))).toBe('unavailable');
  });
});

describe('retryDocumentLoad', () => {
  it('no reintenta un 403 ni un 404: insistir no cambia la respuesta', () => {
    expect(retryDocumentLoad(0, httpError(403))).toBe(false);
    expect(retryDocumentLoad(0, httpError(404))).toBe(false);
  });

  it('reintenta los fallos transitorios hasta tres veces', () => {
    expect(retryDocumentLoad(0, httpError(500))).toBe(true);
    expect(retryDocumentLoad(2, httpError(500))).toBe(true);
    expect(retryDocumentLoad(3, httpError(500))).toBe(false);
  });
});
