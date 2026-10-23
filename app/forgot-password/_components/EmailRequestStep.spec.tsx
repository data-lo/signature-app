import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import EmailRequestStep from './EmailRequestStep';
import { forgotPasswordRequest } from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedForgotPasswordRequest = forgotPasswordRequest as jest.Mock;

describe('EmailRequestStep', () => {
  beforeEach(() => {
    mockedForgotPasswordRequest.mockReset();
  });

  it('valida que el correo sea obligatorio y tenga formato válido', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    renderWithProviders(<EmailRequestStep onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(
      await screen.findByText(/el correo es obligatorio/i),
    ).toBeInTheDocument();
    expect(mockedForgotPasswordRequest).not.toHaveBeenCalled();
  });

  it('al enviar, llama forgotPasswordRequest, muestra el mensaje genérico y avanza al siguiente paso', async () => {
    mockedForgotPasswordRequest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    renderWithProviders(<EmailRequestStep onSuccess={onSuccess} />);

    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'ana@empresa.com',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    await waitFor(() =>
      expect(mockedForgotPasswordRequest).toHaveBeenCalledWith(
        'ana@empresa.com',
      ),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Si el correo está registrado, recibirás un código de verificación',
    );
    expect(onSuccess).toHaveBeenCalledWith('ana@empresa.com');
  });

  it('muestra un error de conexión si la solicitud falla', async () => {
    mockedForgotPasswordRequest.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    renderWithProviders(<EmailRequestStep onSuccess={onSuccess} />);

    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'ana@empresa.com',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(
      await screen.findByText(/error de conexión con el servidor/i),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
