import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import NewPasswordStep from './NewPasswordStep';
import { resetPasswordRequest } from '../_requests';

jest.mock('../_requests');

const mockedResetPasswordRequest = resetPasswordRequest as jest.Mock;

describe('NewPasswordStep', () => {
  beforeEach(() => {
    mockedResetPasswordRequest.mockReset();
  });

  it('valida longitud mínima y que las contraseñas coincidan', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewPasswordStep resetToken="reset-jwt-1" onSuccess={jest.fn()} />,
    );

    await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'short');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'other');
    await user.click(
      screen.getByRole('button', { name: /actualizar contraseña/i }),
    );

    expect(
      await screen.findByText(/al menos 8 caracteres/i),
    ).toBeInTheDocument();
    expect(mockedResetPasswordRequest).not.toHaveBeenCalled();
  });

  it('con contraseñas válidas y coincidentes, llama resetPasswordRequest y onSuccess', async () => {
    mockedResetPasswordRequest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    renderWithProviders(
      <NewPasswordStep resetToken="reset-jwt-1" onSuccess={onSuccess} />,
    );

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
    expect(onSuccess).toHaveBeenCalled();
  });

  it('permite mostrar/ocultar la contraseña con el botón Eye/EyeOff', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewPasswordStep resetToken="reset-jwt-1" onSuccess={jest.fn()} />,
    );

    const passwordInput = screen.getByLabelText(/^nueva contraseña$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: /mostrar contraseña/i })[0]);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('muestra el error del backend si el reseteo falla (p. ej. token expirado)', async () => {
    mockedResetPasswordRequest.mockRejectedValue({
      response: { data: { message: 'Token inválido o expirado' } },
    });
    const user = userEvent.setup();
    renderWithProviders(
      <NewPasswordStep resetToken="reset-jwt-1" onSuccess={jest.fn()} />,
    );

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

    expect(
      await screen.findByText(/token inválido o expirado/i),
    ).toBeInTheDocument();
  });
});
