import { AxiosError, type AxiosResponse } from 'axios';
import apiClient from './axios';
import { clearAuthToken } from './cookies';
import { buildLoginPath } from './auth-redirect';

jest.mock('./cookies');
jest.mock('./observability/api-request');
jest.mock('./observability/safe-log', () => ({
  buildSafeHttpLog: jest.fn(),
  isConsoleLoggingEnabled: () => false,
  reportSafeHttpLog: jest.fn(),
}));
jest.mock('./auth-redirect', () => ({
  ...jest.requireActual('./auth-redirect'),
  buildLoginPath: jest.fn(jest.requireActual('./auth-redirect').buildLoginPath),
}));

const mockedBuildLoginPath = buildLoginPath as jest.Mock;
const mockedClearAuthToken = clearAuthToken as jest.Mock;

/** El manejador de errores del interceptor de respuesta, tal como lo registró `lib/axios`. */
function rejectedHandler(): (error: unknown) => Promise<unknown> {
  const handlers = (
    apiClient.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    }
  ).handlers;
  return handlers[0].rejected;
}

function httpError(status: number): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

/**
 * Sesión que expira o se revoca a media navegación: la API responde 401 y el cliente manda al
 * login recordando la pantalla en la que estaba, para volver a ella al iniciar sesión.
 *
 * jsdom no deja observar `window.location.href` (ver `useLogin.spec`), así que se fija la ruta
 * con la que se arma el destino.
 */
describe('apiClient — sesión expirada (401)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('limpia la sesión y manda al login recordando la ruta actual con su query', async () => {
    window.history.pushState({}, '', '/dashboard/documents?view=pending');

    await expect(rejectedHandler()(httpError(401))).rejects.toBeInstanceOf(
      AxiosError,
    );

    expect(mockedClearAuthToken).toHaveBeenCalled();
    expect(mockedBuildLoginPath).toHaveBeenCalledWith(
      '/dashboard/documents?view=pending',
    );
    expect(mockedBuildLoginPath).toHaveReturnedWith(
      '/login?returnTo=%2Fdashboard%2Fdocuments%3Fview%3Dpending',
    );
  });

  it('en el propio login (credenciales inválidas) no redirige', async () => {
    window.history.pushState({}, '', '/login');

    await expect(rejectedHandler()(httpError(401))).rejects.toBeInstanceOf(
      AxiosError,
    );

    expect(mockedBuildLoginPath).not.toHaveBeenCalled();
  });

  it('otros errores no tocan la sesión', async () => {
    window.history.pushState({}, '', '/dashboard/documents');

    await expect(rejectedHandler()(httpError(500))).rejects.toBeInstanceOf(
      AxiosError,
    );

    expect(mockedClearAuthToken).not.toHaveBeenCalled();
    expect(mockedBuildLoginPath).not.toHaveBeenCalled();
  });
});
