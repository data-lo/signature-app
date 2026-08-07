'use client';

import { useCallback, useState } from 'react';

export type GeolocationStatus = 'idle' | 'requesting' | 'success' | 'error';

export type GeolocationErrorReason =
  | 'unsupported'
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationResult {
  coords: GeolocationCoords | null;
  error: GeolocationErrorReason | null;
}

const REQUEST_TIMEOUT_MS = 10_000;

function mapPositionError(
  error: GeolocationPositionError,
): GeolocationErrorReason {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'permission-denied';
    case error.TIMEOUT:
      return 'timeout';
    case error.POSITION_UNAVAILABLE:
    default:
      return 'position-unavailable';
  }
}

/**
 * Solicita la ubicación del dispositivo vía `navigator.geolocation` solo cuando se llama
 * `requestLocation()` — pensado para el momento de confirmar una firma, nunca en segundo plano
 * ni fuera de ese flujo. `maximumAge: 0` fuerza una lectura fresca en cada llamada: no se
 * reutiliza una posición cacheada de una firma anterior.
 *
 * Rechazar el permiso, no tener soporte (o no estar en un contexto seguro) y agotar el tiempo de
 * espera nunca lanzan una excepción: `requestLocation()` siempre resuelve, con `coords: null` y
 * el motivo en `error`. Decisión de producto: la firma continúa sin ubicación en vez de
 * bloquearse (ver historia "Capturar y almacenar la geolocalización al firmar documentos");
 * quien use el hook decide qué hacer con `error` (por ejemplo, avisar al usuario).
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>('idle');

  const requestLocation = useCallback((): Promise<GeolocationResult> => {
    setStatus('requesting');

    const isSecureContext =
      typeof window === 'undefined' || window.isSecureContext !== false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      !isSecureContext
    ) {
      setStatus('error');
      return Promise.resolve({ coords: null, error: 'unsupported' });
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStatus('success');
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              ...(position.coords.accuracy != null
                ? { accuracy: position.coords.accuracy }
                : {}),
            },
            error: null,
          });
        },
        (positionError) => {
          setStatus('error');
          resolve({ coords: null, error: mapPositionError(positionError) });
        },
        {
          enableHighAccuracy: true,
          timeout: REQUEST_TIMEOUT_MS,
          maximumAge: 0,
        },
      );
    });
  }, []);

  return { status, requestLocation };
}
