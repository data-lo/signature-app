import { AxiosError, type AxiosResponse } from 'axios';
import { ZodError } from 'zod';

import { toVerificationFailure } from './useDocumentVerification';

function httpError(status: number, message = 'detalle interno del backend') {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data: { message },
    } as AxiosResponse,
  );
}

describe('toVerificationFailure', () => {
  it.each([
    [400, 'FORMAT'],
    [415, 'FORMAT'],
    [422, 'FORMAT'],
    [404, 'NOT_FOUND'],
    [413, 'TOO_LARGE'],
    [500, 'UNKNOWN'],
  ])('HTTP %i → %s', (status, kind) => {
    expect(toVerificationFailure(httpError(status)).kind).toBe(kind);
  });

  it('un error sin respuesta es de red', () => {
    const failure = toVerificationFailure(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    );

    expect(failure.kind).toBe('NETWORK');
    expect(failure.message).toMatch(/conexión/);
  });

  it('una respuesta con forma inesperada es un error desconocido', () => {
    expect(toVerificationFailure(new ZodError([])).kind).toBe('UNKNOWN');
  });

  it('nunca muestra el mensaje del backend', () => {
    const failure = toVerificationFailure(httpError(422, 'stack: at Foo.bar'));

    expect(failure.message).not.toContain('stack');
    expect(failure.title).toBe('No pudimos leer el archivo');
  });
});
