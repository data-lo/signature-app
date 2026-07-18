import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import SignupForm from './SignupForm';
import { useRegister } from '../_hooks/useRegister';

jest.mock('../_hooks/useRegister');

const mockedUseRegister = useRegister as jest.Mock;

describe('SignupForm', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseRegister.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('muestra un error de validación si el RFC es demasiado corto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText(/^rfc$/i), 'CORTO');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(
      await screen.findByText(/el rfc debe tener 12 o 13 caracteres/i),
    ).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envía todos los campos, incluido el RFC, cuando el formulario es válido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
    await user.type(screen.getByLabelText(/apellidos/i), 'Pérez');
    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'juan.perez@empresa.com',
    );
    await user.type(screen.getByLabelText(/puesto/i), 'Gerente');
    await user.type(screen.getByLabelText(/curp/i), 'PELJ850101HDFRNN08');
    await user.type(screen.getByLabelText(/^rfc$/i), 'PELJ850101ABC');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'supersecret123');
    await user.type(
      screen.getByLabelText(/confirmar contraseña/i),
      'supersecret123',
    );
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@empresa.com',
        position: 'Gerente',
        nationalId: 'PELJ850101HDFRNN08',
        rfc: 'PELJ850101ABC',
      }),
    );
  });

  it('prellena el RFC cuando viene de /join (defaultRfc)', () => {
    renderWithProviders(<SignupForm defaultRfc="XAXX010101000" />);

    expect(screen.getByLabelText(/^rfc$/i)).toHaveValue('XAXX010101000');
  });

  it('incluye invitationToken en el envío cuando viene de /join', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SignupForm defaultRfc="PELJ850101ABC" invitationToken="invite-token-1" />,
    );

    await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
    await user.type(screen.getByLabelText(/apellidos/i), 'Pérez');
    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'juan.perez@empresa.com',
    );
    await user.type(screen.getByLabelText(/puesto/i), 'Gerente');
    await user.type(screen.getByLabelText(/curp/i), 'PELJ850101HDFRNN08');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'supersecret123');
    await user.type(
      screen.getByLabelText(/confirmar contraseña/i),
      'supersecret123',
    );
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ invitationToken: 'invite-token-1' }),
    );
  });
});
