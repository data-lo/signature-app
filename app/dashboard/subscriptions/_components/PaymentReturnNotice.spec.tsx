import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import PaymentReturnNotice from './PaymentReturnNotice';

/**
 * El mock lee la variable en cada llamada, así que basta con reasignarla entre pruebas. Mutar
 * un mismo `URLSearchParams` con `delete` mientras se itera deja parámetros de la prueba
 * anterior y las contamina entre sí.
 */
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

function givenQuery(query: string) {
  mockSearchParams = new URLSearchParams(query);
}

describe('PaymentReturnNotice', () => {
  it('payment=success: acusa recibo sin dar la suscripción por activa', async () => {
    givenQuery('payment=success&session_id=cs_test_1');

    renderWithProviders(<PaymentReturnNotice />);

    expect(screen.getByText(/pago recibido/i)).toBeInTheDocument();
    expect(
      screen.getByText(/estamos confirmando tu suscripción/i),
    ).toBeInTheDocument();
    /**
     * La URL de retorno es manipulable: cualquiera puede escribir ?payment=success a mano. El
     * aviso no puede afirmar que la suscripción quedó activa — eso lo confirma el webhook.
     */
    expect(screen.queryByText(/suscripción activa/i)).not.toBeInTheDocument();
  });

  it('payment=cancel: avisa que no hubo cargo y deja reintentar', () => {
    givenQuery('payment=cancel');

    renderWithProviders(<PaymentReturnNotice />);

    expect(screen.getByText(/pago cancelado/i)).toBeInTheDocument();
    expect(screen.getByText(/no se realizó ningún cargo/i)).toBeInTheDocument();
  });

  it('sin el parámetro no dibuja nada', () => {
    givenQuery('');

    const { container } = renderWithProviders(<PaymentReturnNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it('un valor desconocido tampoco dibuja nada', () => {
    givenQuery('payment=cualquier-cosa');

    const { container } = renderWithProviders(<PaymentReturnNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
