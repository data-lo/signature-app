import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin } from './useLogin';
import { loginRequest } from '../_requests';
import { setAuthToken } from '@/lib/cookies';
import apiClient from '@/lib/axios';
import {
  getPendingSignatureContext,
  clearPendingSignatureContext,
} from '@/lib/pending-signature-context';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';
import { resendOtpRequest } from '@/app/signup/_requests';
import { resolvePublicSigningDestination } from '@/lib/public-signing-context';
import { resolvePostLoginDestination } from '@/lib/auth-redirect';

jest.mock('../_requests');
jest.mock('@/lib/cookies');
jest.mock('@/lib/axios');
jest.mock('@/lib/pending-signature-context');
jest.mock('@/lib/public-signing-context');
jest.mock('@/lib/pending-registration-context');
jest.mock('@/app/signup/_requests');
jest.mock('@/lib/auth-redirect', () => ({
  ...jest.requireActual('@/lib/auth-redirect'),
  resolvePostLoginDestination: jest.fn(
    jest.requireActual('@/lib/auth-redirect').resolvePostLoginDestination,
  ),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const mockedLoginRequest = loginRequest as jest.Mock;
const mockedSetAuthToken = setAuthToken as jest.Mock;
const mockedApiClientPatch = apiClient.patch as jest.Mock;
const mockedGetPendingSignatureContext =
  getPendingSignatureContext as jest.Mock;
const mockedClearPendingSignatureContext =
  clearPendingSignatureContext as jest.Mock;
const mockedSetPendingRegistrationContext =
  setPendingRegistrationContext as jest.Mock;
const mockedResendOtpRequest = resendOtpRequest as jest.Mock;
const mockedResolvePublicSigningDestination =
  resolvePublicSigningDestination as jest.Mock;
const mockedResolvePostLoginDestination =
  resolvePostLoginDestination as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// jsdom bloquea toda reasignación de window.location/.href (Object.defineProperty falla con
// "Cannot redefine property" tanto en `window.location` como en `.href`) — no hay forma de
// interceptarlo en este entorno, así que estos tests verifican los efectos que sí son
// observables (setAuthToken, la llamada de vinculación, la limpieza del contexto) y dejan sin
// cubrir el valor literal de la redirección final. jsdom solo emite un warning de "Not
// implemented: navigation" al llegar a esa línea — no hace fallar el test.
describe('useLogin', () => {
  beforeEach(() => {
    mockedLoginRequest.mockReset();
    mockedSetAuthToken.mockReset();
    mockedApiClientPatch.mockReset().mockResolvedValue(undefined);
    mockedGetPendingSignatureContext.mockReset().mockReturnValue(null);
    mockedClearPendingSignatureContext.mockReset();
    mockedSetPendingRegistrationContext.mockReset();
    mockedResendOtpRequest.mockReset();
    mockedResolvePublicSigningDestination.mockReset().mockResolvedValue(null);
    push.mockReset();
    mockedResolvePostLoginDestination.mockClear();
    window.history.pushState({}, '', '/login');
  });

  it('con invitación de la pantalla pública: resuelve la vinculación por invitación y no usa el contexto anterior', async () => {
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    mockedResolvePublicSigningDestination.mockResolvedValue(
      '/dashboard/documents/doc-1',
    );
    mockedGetPendingSignatureContext.mockReturnValue({
      documentId: 'doc-9',
      collaboratorId: 'collab-9',
      email: 'a@a.com',
    });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-1');
    expect(mockedResolvePublicSigningDestination).toHaveBeenCalled();
    // La vinculación la hizo `resolvePublicSigningDestination`; la del contexto anterior no corre.
    expect(mockedApiClientPatch).not.toHaveBeenCalled();
  });

  it('sin contexto pendiente ni ruta previa: guarda el token y va al dashboard de documentos', async () => {
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-1');
    expect(mockedApiClientPatch).not.toHaveBeenCalled();
    expect(mockedClearPendingSignatureContext).not.toHaveBeenCalled();
    expect(mockedResolvePostLoginDestination).toHaveBeenCalledWith('');
    expect(mockedResolvePostLoginDestination).toHaveReturnedWith(
      '/dashboard/documents',
    );
  });

  it('con una ruta protegida previa (?returnTo=), vuelve a ella', async () => {
    window.history.pushState(
      {},
      '',
      '/login?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-7',
    );
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedResolvePostLoginDestination).toHaveReturnedWith(
      '/dashboard/documents/doc-7',
    );
  });

  it('un flujo pendiente (invitación de firma) tiene prioridad sobre la ruta previa', async () => {
    window.history.pushState({}, '', '/login?returnTo=%2Fdashboard%2Fplans');
    mockedResolvePublicSigningDestination.mockResolvedValue(
      '/dashboard/documents/doc-1',
    );
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedResolvePostLoginDestination).not.toHaveBeenCalled();
  });

  it('con contexto pendiente: vincula la cuenta al documento, limpia el contexto y redirige al documento', async () => {
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    mockedGetPendingSignatureContext.mockReturnValue({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'a@a.com',
    });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApiClientPatch).toHaveBeenCalledWith(
      '/api/v1/document/doc-1/link-collaborator',
    );
    expect(mockedClearPendingSignatureContext).toHaveBeenCalled();
  });

  it('con contexto pendiente: si falla la vinculación, igual limpia el contexto y redirige al documento (best-effort)', async () => {
    mockedLoginRequest.mockResolvedValue({ token: 'jwt-1', user: {} });
    mockedGetPendingSignatureContext.mockReturnValue({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'a@a.com',
    });
    mockedApiClientPatch.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedClearPendingSignatureContext).toHaveBeenCalled();
  });

  it('bug corregido: con 403 (cuenta no verificada), reenvía el OTP y manda a /signup/verify en vez de mostrar un error genérico', async () => {
    mockedLoginRequest.mockRejectedValue({
      response: { status: 403, data: { message: 'Debes verificar tu correo' } },
    });
    mockedResendOtpRequest.mockResolvedValue({
      email: 'a@a.com',
      maskedEmail: 'a***a@a.com',
    });
    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ email: 'a@a.com', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockedResendOtpRequest).toHaveBeenCalledWith('a@a.com');
    expect(mockedSetPendingRegistrationContext).toHaveBeenCalledWith({
      email: 'a@a.com',
      maskedEmail: 'a***a@a.com',
      isNewPreRegistration: false,
    });
    expect(push).toHaveBeenCalledWith('/signup/verify');
  });
});
