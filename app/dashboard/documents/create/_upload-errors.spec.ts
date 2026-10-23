import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import {
  getUploadErrorMessage,
  UPLOAD_CONNECTION_LOST_MESSAGE,
  UPLOAD_TIMEOUT_MESSAGE,
  UPLOAD_TOO_LARGE_MESSAGE,
} from './_upload-errors';

const FALLBACK = 'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.';

function axiosErrorWith({
  status,
  code,
  data,
}: {
  status?: number;
  code?: string;
  data?: unknown;
}) {
  const response =
    status === undefined
      ? undefined
      : ({
          status,
          statusText: '',
          headers: {},
          config: { headers: new AxiosHeaders() },
          data,
        } as AxiosResponse);
  return new AxiosError('fallo', code, undefined, undefined, response);
}

describe('getUploadErrorMessage', () => {
  it('413: explica el límite de negocio, no el techo técnico del servidor', () => {
    const error = axiosErrorWith({
      status: 413,
      data: { message: 'El archivo excede el tamaño máximo permitido por el servidor (25MB)' },
    });

    expect(getUploadErrorMessage(error, FALLBACK)).toBe(UPLOAD_TOO_LARGE_MESSAGE);
    expect(UPLOAD_TOO_LARGE_MESSAGE).toContain('20 MB');
  });

  it.each([
    ['código ECONNABORTED de axios', { code: 'ECONNABORTED' }],
    ['código ETIMEDOUT de axios', { code: 'ETIMEDOUT' }],
    ['504 del proxy', { status: 504 }],
    ['502 del proxy', { status: 502 }],
  ])('tiempo agotado (%s)', (_label, params) => {
    expect(getUploadErrorMessage(axiosErrorWith(params), FALLBACK)).toBe(
      UPLOAD_TIMEOUT_MESSAGE,
    );
  });

  it('sin respuesta: la conexión se interrumpió a mitad de la subida', () => {
    const error = axiosErrorWith({ code: 'ERR_NETWORK' });

    expect(getUploadErrorMessage(error, FALLBACK)).toBe(
      UPLOAD_CONNECTION_LOST_MESSAGE,
    );
  });

  it('respeta el mensaje del backend cuando lo hay (p. ej. PDF dañado)', () => {
    const error = axiosErrorWith({
      status: 400,
      data: { message: 'No se pudo leer el PDF.' },
    });

    expect(getUploadErrorMessage(error, FALLBACK)).toBe('No se pudo leer el PDF.');
  });

  it('sin mensaje del backend ni causa reconocible, usa el fallback', () => {
    expect(getUploadErrorMessage(axiosErrorWith({ status: 500 }), FALLBACK)).toBe(
      FALLBACK,
    );
    expect(getUploadErrorMessage(new Error('otra cosa'), FALLBACK)).toBe(FALLBACK);
  });

  it('todos los mensajes propios invitan a reintentar', () => {
    for (const message of [
      UPLOAD_TOO_LARGE_MESSAGE,
      UPLOAD_CONNECTION_LOST_MESSAGE,
      UPLOAD_TIMEOUT_MESSAGE,
    ]) {
      expect(message).toMatch(/inténtalo de nuevo/i);
    }
  });
});
