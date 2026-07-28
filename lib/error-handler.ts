import type { AxiosError } from 'axios';

/**
 * Único punto para leer el mensaje de error de una respuesta Axios — antes esta misma lógica
 * (leer `error.response.data.message` y caer a un mensaje genérico si no viene) estaba declarada
 * de forma local, casi idéntica, en cada hook de mutación de la app (uno por acción: firmar,
 * rechazar, invitar, crear organización, etc.).
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? fallbackMessage;
}
