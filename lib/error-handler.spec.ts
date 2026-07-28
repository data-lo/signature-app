import { AxiosError } from 'axios';
import { getErrorMessage } from './error-handler';

function buildAxiosError(message?: string, status = 400): AxiosError {
  return {
    isAxiosError: true,
    response: {
      data: message !== undefined ? { message } : {},
      status,
      statusText: '',
      headers: {},
      config: {} as never,
    },
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe('getErrorMessage', () => {
  it('devuelve el mensaje del backend cuando está presente', () => {
    expect(getErrorMessage(buildAxiosError('Correo ya registrado'))).toBe(
      'Correo ya registrado',
    );
  });

  it('devuelve el fallback recibido cuando el backend no manda mensaje', () => {
    expect(
      getErrorMessage(buildAxiosError(undefined), 'Fallback personalizado'),
    ).toBe('Fallback personalizado');
  });

  it('devuelve el fallback recibido cuando el error no tiene forma de AxiosError', () => {
    expect(getErrorMessage(new Error('boom'), 'Fallback personalizado')).toBe(
      'Fallback personalizado',
    );
  });

  it('devuelve un mensaje genérico por defecto si no se pasa fallback', () => {
    expect(getErrorMessage(new Error('boom'))).toBe(
      'Ocurrió un error inesperado. Intenta de nuevo.',
    );
  });
});
