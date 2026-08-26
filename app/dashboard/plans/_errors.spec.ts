import { AxiosError, AxiosHeaders } from 'axios';
import {
  PaymentsError,
  describePaymentsError,
  toPaymentsError,
} from './_errors';

function axiosErrorWithStatus(status: number): AxiosError {
  const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE');
  error.response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('toPaymentsError', () => {
  /**
   * Cada código lleva a una categoría distinta porque cada una cambia lo que el usuario puede
   * hacer. Mezclarlas fue lo que dejó un fallo de configuración del despliegue reportado como
   * "no cargan los planes", sin causa.
   */
  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [404, 'not-found'],
    [500, 'misconfigured'],
    [501, 'misconfigured'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [504, 'unavailable'],
  ])('clasifica el %s como %s', (status, kind) => {
    const error = toPaymentsError(axiosErrorWithStatus(status as number));

    expect(error).toBeInstanceOf(PaymentsError);
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
  });

  it('trata un fallo sin respuesta como problema de red', () => {
    const error = toPaymentsError(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    );

    expect(error.kind).toBe('network');
    expect(error.status).toBeNull();
  });

  it('no disfraza de fallo de pagos un error que no viene de la API', () => {
    const error = toPaymentsError(new TypeError('algo reventó al renderizar'));

    expect(error.kind).toBe('unknown');
    expect(error.status).toBeNull();
  });
});

describe('describePaymentsError', () => {
  /**
   * Ofrecer "Reintentar" donde reintentar no puede funcionar —una llave mal configurada, una ruta
   * que no existe, una sesión vencida— manda al usuario a repetir un fallo garantizado.
   */
  it('sólo ofrece reintentar cuando reintentar puede servir', () => {
    expect(
      describePaymentsError(toPaymentsError(axiosErrorWithStatus(502)))
        .canRetry,
    ).toBe(true);

    expect(
      describePaymentsError(toPaymentsError(axiosErrorWithStatus(500)))
        .canRetry,
    ).toBe(false);
    expect(
      describePaymentsError(toPaymentsError(axiosErrorWithStatus(404)))
        .canRetry,
    ).toBe(false);
    expect(
      describePaymentsError(toPaymentsError(axiosErrorWithStatus(401)))
        .canRetry,
    ).toBe(false);
  });

  it('distingue configuración del servidor de proveedor caído', () => {
    const misconfigured = describePaymentsError(
      toPaymentsError(axiosErrorWithStatus(500)),
    );
    const unavailable = describePaymentsError(
      toPaymentsError(axiosErrorWithStatus(502)),
    );

    expect(misconfigured.title).not.toBe(unavailable.title);
    expect(misconfigured.description).toMatch(/configuración/i);
    expect(unavailable.description).toMatch(/temporal/i);
  });

  /** Un fallo de render inesperado no puede acabar culpando al proveedor de pagos. */
  it('cae al mensaje genérico con un error ajeno al flujo', () => {
    const generic = describePaymentsError(new Error('boom'));

    expect(generic.title).toBe('No pudimos cargar los planes');
    expect(generic.status).toBeNull();
  });
});
