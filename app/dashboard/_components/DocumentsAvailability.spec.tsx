import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentsAvailability, {
  ADD_DOCUMENTS_LABEL,
  SUBSCRIPTIONS_ROUTE,
} from './DocumentsAvailability';
import { getBillingAccessRequest } from '@/lib/api/billing';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { useAuthStore } from '@/lib/store/useAuthStore';

jest.mock('@/lib/api/billing');

const mockedRequest = getBillingAccessRequest as jest.Mock;

const ACCOUNT_ID = 'cuenta-personal-1';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function givenActiveAccount(id: string | null = ACCOUNT_ID) {
  useAuthStore.setState({
    activeAccount: id
      ? { id, accountType: 'PERSONAL', organizationId: null, roleId: null }
      : null,
  });
}

describe('DocumentsAvailability', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockedRequest.mockReset();
    givenActiveAccount();
  });

  it('anuncia el saldo de la cuenta activa', async () => {
    mockedRequest.mockResolvedValue(
      buildBillingAccess({ creditsAvailable: 12 }),
    );

    render(<DocumentsAvailability />, { wrapper });

    expect(
      await screen.findByText('12 Documentos Disponibles'),
    ).toBeInTheDocument();
  });

  /**
   * La historia pide la cantidad y nada más: el tope por periodo y la fracción son de la tarjeta
   * de suscripción, y acá obligarían a hacer una cuenta para responder "¿me quedan documentos?".
   */
  it('no anuncia el tope del plan ni una fracción junto al saldo', async () => {
    mockedRequest.mockResolvedValue(
      buildBillingAccess({
        creditsAvailable: 12,
        limits: { documentsIncludedPerPeriod: 50 },
      }),
    );

    render(<DocumentsAvailability />, { wrapper });

    await screen.findByText('12 Documentos Disponibles');
    expect(screen.queryByText(/50/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bde\b/)).not.toBeInTheDocument();
  });

  it('concuerda la leyenda en singular con un solo documento', async () => {
    mockedRequest.mockResolvedValue(
      buildBillingAccess({ creditsAvailable: 1 }),
    );

    render(<DocumentsAvailability />, { wrapper });

    expect(
      await screen.findByText('1 Documento Disponible'),
    ).toBeInTheDocument();
  });

  /** `0` es una respuesta —la cuenta se quedó sin documentos—, no una ausencia de dato. */
  it('anuncia el saldo agotado en vez de callarse', async () => {
    mockedRequest.mockResolvedValue(
      buildBillingAccess({ creditsAvailable: 0 }),
    );

    render(<DocumentsAvailability />, { wrapper });

    expect(
      await screen.findByText('0 Documentos Disponibles'),
    ).toBeInTheDocument();
  });

  /**
   * Un `0` provisional mientras llega la respuesta diría que la cuenta se quedó sin documentos,
   * que es exactamente lo que no se puede afirmar sin saberlo.
   */
  it('mientras el saldo no se conoce no escribe ninguna cifra, pero el botón ya está', () => {
    mockedRequest.mockReturnValue(new Promise(() => {}));

    render(<DocumentsAvailability />, { wrapper });

    expect(
      screen.queryByText(/Documentos? Disponibles?/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: ADD_DOCUMENTS_LABEL }),
    ).toBeInTheDocument();
  });

  it('el botón lleva a Suscripciones', async () => {
    mockedRequest.mockResolvedValue(buildBillingAccess());

    render(<DocumentsAvailability />, { wrapper });

    expect(
      screen.getByRole('link', { name: ADD_DOCUMENTS_LABEL }),
    ).toHaveAttribute('href', SUBSCRIPTIONS_ROUTE);
    await waitFor(() => expect(mockedRequest).toHaveBeenCalled());
  });

  /**
   * El saldo es de la CUENTA ACTIVA, y la cuenta va en la `queryKey` de `useBillingAccess`: al
   * cambiar de cuenta se vuelve a consultar y el número se redibuja solo. Sin esta prueba, un
   * caché compartido entre cuentas anunciaría el saldo de la cuenta que se acaba de dejar.
   */
  it('vuelve a consultar el saldo al cambiar de cuenta', async () => {
    mockedRequest.mockResolvedValueOnce(
      buildBillingAccess({ creditsAvailable: 12 }),
    );

    render(<DocumentsAvailability />, { wrapper });
    await screen.findByText('12 Documentos Disponibles');

    mockedRequest.mockResolvedValueOnce(
      buildBillingAccess({ creditsAvailable: 3 }),
    );
    givenActiveAccount('cuenta-org-1');

    expect(
      await screen.findByText('3 Documentos Disponibles'),
    ).toBeInTheDocument();
  });
});
