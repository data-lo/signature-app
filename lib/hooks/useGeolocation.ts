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
