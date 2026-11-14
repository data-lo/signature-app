import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import {
  getInsufficientBiometricCredits,
  insufficientBiometricCreditsMessage,
} from './_insufficient-biometric-credits';

function axiosErrorWith(status: number, data: unknown) {
  return new AxiosError('fallo', undefined, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  } as AxiosResponse);
}

describe('getInsufficientBiometricCredits', () => {
  it('lee los créditos del 402 INSUFFICIENT_BIOMETRIC_CREDITS', () => {
    const error = axiosErrorWith(402, {
      success: false,
      message: 'Saldo insuficiente para firmas biométricas.',
      error: {
        code: 'INSUFFICIENT_BIOMETRIC_CREDITS',
        details: { required: 3, available: 2 },
      },
    });

    expect(getInsufficientBiometricCredits(error)).toEqual({
      required: 3,
      available: 2,
    });
  });

  it('acepta el código y los detalles en la raíz del cuerpo', () => {
    const error = axiosErrorWith(402, {
      code: 'INSUFFICIENT_BIOMETRIC_CREDITS',
      details: { required: 1, available: 0 },
    });

    expect(getInsufficientBiometricCredits(error)).toEqual({
      required: 1,
      available: 0,
    });
  });

  it('sin números válidos devuelve null en cada uno, pero reconoce el error', () => {
    const error = axiosErrorWith(402, {
      error: {
        code: 'INSUFFICIENT_BIOMETRIC_CREDITS',
        details: { required: '3' },
      },
    });

    expect(getInsufficientBiometricCredits(error)).toEqual({
      required: null,
      available: null,
    });
  });

  it('ignora otros 402 y otros estados', () => {
    expect(
      getInsufficientBiometricCredits(
        axiosErrorWith(402, { message: 'No tienes documentos disponibles.' }),
      ),
    ).toBeNull();
    expect(
      getInsufficientBiometricCredits(
        axiosErrorWith(400, { code: 'INSUFFICIENT_BIOMETRIC_CREDITS' }),
      ),
    ).toBeNull();
    expect(getInsufficientBiometricCredits(new Error('x'))).toBeNull();
  });
});

describe('insufficientBiometricCreditsMessage', () => {
  it.each([
    [3, 2, 'Necesitas 3 créditos y tienes 2 disponibles.'],
    [1, 0, 'Necesitas 1 crédito y tienes 0 disponibles.'],
    [2, 1, 'Necesitas 2 créditos y tienes 1 disponible.'],
  ])('%i requeridos y %i disponibles', (required, available, expected) => {
    expect(insufficientBiometricCreditsMessage({ required, available })).toBe(
      expected,
    );
  });

  it('sin números usa una frase genérica', () => {
    expect(
      insufficientBiometricCreditsMessage({ required: null, available: null }),
    ).toMatch(/no tienes créditos biométricos suficientes/i);
  });
});
