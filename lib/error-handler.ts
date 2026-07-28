import { AxiosError } from 'axios';

const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo.';

/**
 * Único punto de verdad para mapear un error de una mutación a un mensaje mostrable al usuario:
 * antes esta misma lógica (leer axiosError.response?.data?.message y caer a un fallback) estaba
 * declarada de forma local en cada hook de mutación, duplicada más de una decena de veces.
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE,
): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? fallback;
}
