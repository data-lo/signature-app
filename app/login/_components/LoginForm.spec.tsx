import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import LoginForm from './LoginForm';
import { useLogin } from '../_hooks/useLogin';

jest.mock('../_hooks/useLogin');

const mockedUseLogin = useLogin as jest.Mock;

describe('LoginForm', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseLogin.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('muestra errores de validación si se envía vacío', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(
      await screen.findByText(/el correo es obligatorio/i),
    ).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('llama a la mutación de login con el correo y contraseña ingresados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'usuario@correo.com',
    );
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(mutate).toHaveBeenCalledWith({
      email: 'usuario@correo.com',
      password: 'secreto123',
    });
  });

  it('deshabilita el botón mientras la mutación está en curso', () => {
    mockedUseLogin.mockReturnValue({
      mutate,
      isPending: true,
      isError: false,
      error: null,
    });
    renderWithProviders(<LoginForm />);

    expect(
      screen.getByRole('button', { name: /iniciando sesión/i }),
    ).toBeDisabled();
  });
});
