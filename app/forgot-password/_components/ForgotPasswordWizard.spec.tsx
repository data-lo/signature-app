import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import ForgotPasswordWizard from './ForgotPasswordWizard';
import {
  forgotPasswordRequest,
  verifyResetCodeRequest,
  resetPasswordRequest,
} from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const mockedForgotPasswordRequest = forgotPasswordRequest as jest.Mock;
const mockedVerifyResetCodeRequest = verifyResetCodeRequest as jest.Mock;
const mockedResetPasswordRequest = resetPasswordRequest as jest.Mock;

describe('ForgotPasswordWizard', () => {
  beforeEach(() => {
    mockedForgotPasswordRequest.mockReset().mockResolvedValue(undefined);
    mockedVerifyResetCodeRequest.mockReset();
    mockedResetPasswordRequest.mockReset().mockResolvedValue(undefined);
    push.mockReset();
  });

  it('completa los 3 pasos (email → OTP → nueva contraseña) y termina en /login?reset=1', async () => {
    mockedVerifyResetCodeRequest.mockResolvedValue({
      resetToken: 'reset-jwt-1',
    });
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordWizard />);

    // Paso 1: email
    expect(screen.getByText(/recupera tu contraseña/i)).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'ana@empresa.com',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    // Paso 2: OTP
    expect(
      await screen.findByText(/verifica tu código/i),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/código de verificación/i),
      '123456',
    );
    await user.click(
      screen.getByRole('button', { name: /^verificar código$/i }),
    );
    expect(mockedVerifyResetCodeRequest).toHaveBeenCalledWith(
      'ana@empresa.com',
      '123456',
    );

    // Paso 3: nueva contraseña
    expect(
      await screen.findByLabelText(/confirmar contraseña/i),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/^nueva contraseña$/i),
      'NuevaPassword123!',
    );
    await user.type(
      screen.getByLabelText(/confirmar contraseña/i),
      'NuevaPassword123!',
    );
    await user.click(
      screen.getByRole('button', { name: /actualizar contraseña/i }),
    );

    await waitFor(() =>
      expect(mockedResetPasswordRequest).toHaveBeenCalledWith(
        'reset-jwt-1',
        'NuevaPassword123!',
        'NuevaPassword123!',
      ),
    );
    expect(push).toHaveBeenCalledWith('/login?reset=1');
  });
});
