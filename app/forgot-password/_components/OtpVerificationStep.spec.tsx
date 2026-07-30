import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import OtpVerificationStep from './OtpVerificationStep';
import { forgotPasswordRequest, verifyResetCodeRequest } from '../_requests';

jest.mock('../_requests');

const mockedForgotPasswordRequest = forgotPasswordRequest as jest.Mock;
const mockedVerifyResetCodeRequest = verifyResetCodeRequest as jest.Mock;

describe('OtpVerificationStep', () => {
  beforeEach(() => {
    mockedForgotPasswordRequest.mockReset().mockResolvedValue(undefined);
    mockedVerifyResetCodeRequest.mockReset();
  });

  it('muestra el correo al que se envió el código', () => {
    renderWithProviders(
      <OtpVerificationStep email="ana@empresa.com" onSuccess={jest.fn()} />,
    );

    expect(screen.getByText('ana@empresa.com')).toBeInTheDocument();
  });

  it('al verificar exitosamente, llama onSuccess con el resetToken', async () => {
    mockedVerifyResetCodeRequest.mockResolvedValue({
      resetToken: 'reset-jwt-1',
    });
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    renderWithProviders(
      <OtpVerificationStep email="ana@empresa.com" onSuccess={onSuccess} />,
    );

    await user.type(
      screen.getByLabelText(/código de verificación/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /^verificar código$/i }));

    await waitFor(() =>
      expect(mockedVerifyResetCodeRequest).toHaveBeenCalledWith(
        'ana@empresa.com',
        '123456',
      ),
    );
    expect(onSuccess).toHaveBeenCalledWith('reset-jwt-1');
  });

  it('muestra un error si el código es inválido o expiró', async () => {
    mockedVerifyResetCodeRequest.mockRejectedValue({
      response: { data: { message: 'Código de verificación inválido' } },
    });
    const user = userEvent.setup();
    renderWithProviders(
      <OtpVerificationStep email="ana@empresa.com" onSuccess={jest.fn()} />,
    );

    await user.type(
      screen.getByLabelText(/código de verificación/i),
      '000000',
    );
    await user.click(screen.getByRole('button', { name: /^verificar código$/i }));

    expect(
      await screen.findByText(/código de verificación inválido/i),
    ).toBeInTheDocument();
  });

  it('reenviar código llama forgotPasswordRequest y arranca el cooldown de 30s', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const user = userEvent.setup();
    renderWithProviders(
      <OtpVerificationStep email="ana@empresa.com" onSuccess={jest.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /reenviar código/i }));

    await waitFor(() =>
      expect(mockedForgotPasswordRequest).toHaveBeenCalledWith(
        'ana@empresa.com',
      ),
    );
    expect(
      screen.getByRole('button', { name: /reenviar código \(30s\)/i }),
    ).toBeDisabled();

    jest.advanceTimersByTime(30_000);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^reenviar código$/i }),
      ).not.toBeDisabled(),
    );

    jest.useRealTimers();
  });
});
