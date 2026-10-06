import type { GeolocationErrorReason } from './useGeolocation';

/**
 * Por qué no se pudo obtener la ubicación, en palabras del firmante. La comparten todas las
 * pantallas de firma —con cuenta y de invitado— porque sin ubicación ninguna firma se registra.
 */
export const GEOLOCATION_ERROR_MESSAGES: Record<
  GeolocationErrorReason,
  string
> = {
  unsupported: 'tu navegador no permite compartir ubicación aquí',
  'permission-denied': 'no diste permiso de ubicación',
  'position-unavailable': 'no se pudo determinar tu ubicación',
  timeout: 'se agotó el tiempo de espera para obtener tu ubicación',
};
