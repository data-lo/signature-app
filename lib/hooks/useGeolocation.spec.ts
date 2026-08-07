import { act, renderHook } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

function mockGeolocationSuccess(
  coords = { latitude: 19.4326, longitude: -99.1332, accuracy: 15 },
) {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success: PositionCallback) =>
        success({ coords } as GeolocationPosition),
      ),
    },
  });
}

function mockGeolocationError(code: 1 | 2 | 3) {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(
        (_success: PositionCallback, error: PositionErrorCallback) =>
          error({
            code,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError),
      ),
    },
  });
}

function mockGeolocationUnsupported() {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
}

describe('useGeolocation', () => {
  it('empieza en estado idle', () => {
    mockGeolocationSuccess();
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe('idle');
  });

  it('resuelve con las coordenadas y pasa a success cuando el permiso se concede', async () => {
    mockGeolocationSuccess({
      latitude: 19.4326,
      longitude: -99.1332,
      accuracy: 15,
    });
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({
      coords: { latitude: 19.4326, longitude: -99.1332, accuracy: 15 },
      error: null,
    });
    expect(result.current.status).toBe('success');
  });

  it('omite accuracy en el resultado cuando el navegador no la reporta', async () => {
    mockGeolocationSuccess({
      latitude: 19.4326,
      longitude: -99.1332,
      accuracy: undefined as unknown as number,
    });
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!.coords).toEqual({
      latitude: 19.4326,
      longitude: -99.1332,
    });
  });

  it('pide una lectura fresca en cada llamada (no reutiliza una posición cacheada)', async () => {
    mockGeolocationSuccess();
    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ maximumAge: 0 }),
    );
  });

  it('resuelve error "permission-denied" sin lanzar cuando el usuario rechaza el permiso', async () => {
    mockGeolocationError(1);
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({ coords: null, error: 'permission-denied' });
    expect(result.current.status).toBe('error');
  });

  it('resuelve error "position-unavailable" cuando la ubicación no puede determinarse', async () => {
    mockGeolocationError(2);
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({ coords: null, error: 'position-unavailable' });
  });

  it('resuelve error "timeout" cuando se agota el tiempo de espera', async () => {
    mockGeolocationError(3);
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({ coords: null, error: 'timeout' });
  });

  it('resuelve error "unsupported" cuando el navegador no expone navigator.geolocation', async () => {
    mockGeolocationUnsupported();
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({ coords: null, error: 'unsupported' });
    expect(result.current.status).toBe('error');
  });

  it('resuelve error "unsupported" fuera de un contexto seguro, sin intentar leer la posición', async () => {
    mockGeolocationSuccess();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useGeolocation());

    let resolved: Awaited<ReturnType<typeof result.current.requestLocation>>;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved!).toEqual({ coords: null, error: 'unsupported' });
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });
});
