import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import PasswordCard from './PasswordCard';
import { useChangePassword } from '../_hooks/useChangePassword';

jest.mock('../_hooks/useChangePassword');

const mockedUseChangePassword = useChangePassword as jest.Mock;

const CURRENT = 'contrasenaActual';
const NEW = 'contrasenaNueva';

const field = {
  current: () => screen.getByLabelText('Contraseña actual'),
  new: () => screen.getByLabelText('Nueva contraseña'),
  confirm: () => screen.getByLabelText('Confirmar nueva contraseña'),
};

const saveButton = () =>
  screen.getByRole('button', { name: /guardar cambios/i });

describe('PasswordCard', () => {
  const changeMutate = jest.fn();

  beforeEach(() => {
    changeMutate.mockReset();
    mockedUseChangePassword.mockReturnValue({
      mutate: changeMutate,
      isPending: false,
    });
  });

  /** Llena las tres contraseñas con valores válidos y coincidentes. */
  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(field.current(), CURRENT);
    await user.type(field.new(), NEW);
    await user.type(field.confirm(), NEW);
  }

  it('es una tarjeta propia llamada "Contraseña" con los tres campos', () => {
    renderWithProviders(<PasswordCard />);

    expect(screen.getByText('Contraseña')).toBeInTheDocument();
    expect(field.current()).toBeInTheDocument();
    expect(field.new()).toBeInTheDocument();
    expect(field.confirm()).toBeInTheDocument();
  });

  describe('botón "Guardar cambios"', () => {
    /** El estado inicial es el formulario vacío: sin escribir nada no hay cambio que guardar. */
    it('arranca deshabilitado', () => {
      renderWithProviders(<PasswordCard />);

      expect(saveButton()).toBeDisabled();
    });

    it('sigue deshabilitado mientras el formulario está incompleto', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await user.type(field.current(), CURRENT);
      await user.type(field.new(), NEW);

      expect(saveButton()).toBeDisabled();
    });

    it('se habilita cuando el cambio es válido', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await fillValidForm(user);

      await waitFor(() => expect(saveButton()).toBeEnabled());
    });

    it('se deshabilita mientras el guardado está en curso', async () => {
      mockedUseChangePassword.mockReturnValue({
        mutate: changeMutate,
        isPending: true,
      });
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await fillValidForm(user);

      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });
  });

  describe('validaciones', () => {
    it('avisa si la nueva contraseña y su confirmación no coinciden, y no deja guardar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await user.type(field.current(), CURRENT);
      await user.type(field.new(), NEW);
      await user.type(field.confirm(), 'otraContrasena');

      expect(
        await screen.findByText('Las contraseñas no coinciden'),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it('exige una contraseña nueva de al menos 8 caracteres', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await user.type(field.current(), CURRENT);
      await user.type(field.new(), 'corta');
      await user.type(field.confirm(), 'corta');

      expect(
        await screen.findByText(
          'La contraseña debe tener al menos 8 caracteres',
        ),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });
  });

  describe('guardado', () => {
    it('manda las tres contraseñas al enviar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await fillValidForm(user);
      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      expect(changeMutate).toHaveBeenCalledWith(
        {
          currentPassword: CURRENT,
          newPassword: NEW,
          confirmPassword: NEW,
        },
        expect.anything(),
      );
    });

    it('limpia los campos y vuelve a deshabilitar el botón cuando el guardado sale bien', async () => {
      changeMutate.mockImplementation((_values, options) =>
        options?.onSuccess?.(),
      );
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await fillValidForm(user);
      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() => expect(field.current()).toHaveValue(''));
      expect(field.new()).toHaveValue('');
      expect(field.confirm()).toHaveValue('');
      expect(saveButton()).toBeDisabled();
    });

    /**
     * Si el backend rechaza la contraseña actual, vaciar los campos obligaría a reescribir las
     * tres para reintentar.
     */
    it('conserva lo escrito si el guardado falla', async () => {
      changeMutate.mockImplementation((_values, options) =>
        options?.onError?.(new Error('401')),
      );
      const user = userEvent.setup();
      renderWithProviders(<PasswordCard />);

      await fillValidForm(user);
      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      expect(field.current()).toHaveValue(CURRENT);
      expect(field.new()).toHaveValue(NEW);
    });
  });
});
