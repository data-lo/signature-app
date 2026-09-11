import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import CreateOrganizationForm from './CreateOrganizationForm';
import { useCreateOrganization } from '../_hooks/useCreateOrganization';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';

jest.mock('../_hooks/useCreateOrganization');

const mockedUseCreateOrganization = useCreateOrganization as jest.Mock;

const ACCOUNT_ID = 'account-1';

/**
 * Llena los dos campos obligatorios del formulario.
 *
 * @param user - Sesión de `userEvent`.
 * @returns Nada.
 *
 * @example
 * await fillForm(user);
 */
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre de visualización/i), 'Acme');
  await user.type(
    screen.getByLabelText(/razón social/i),
    'Acme Corp S.A. de C.V.',
  );
}

describe('CreateOrganizationForm', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseCreateOrganization.mockReturnValue({
      mutate,
      isPending: false,
    });
    useAuthStore.setState({
      activeAccount: {
        id: ACCOUNT_ID,
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: 'OWNER',
      },
      billingByAccountId: {},
    });
  });

  it('mantiene el botón deshabilitado hasta llenar ambos campos obligatorios', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateOrganizationForm />);

    const submitButton = screen.getByRole('button', {
      name: /crear organización/i,
    });
    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/nombre de visualización/i),
      'Acme',
    );
    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/razón social/i),
      'Acme Corp S.A. de C.V.',
    );
    expect(submitButton).toBeEnabled();
  });

  it('envía name y organizationName cuando el formulario es válido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateOrganizationForm />);

    await fillForm(user);
    await user.click(
      screen.getByRole('button', { name: /crear organización/i }),
    );

    expect(mutate).toHaveBeenCalledWith({
      name: 'Acme',
      organizationName: 'Acme Corp S.A. de C.V.',
    });
  });

  it('muestra el estado de carga mientras la mutación está pendiente', () => {
    mockedUseCreateOrganization.mockReturnValue({ mutate, isPending: true });
    renderWithProviders(<CreateOrganizationForm />);

    expect(
      screen.getByRole('button', { name: /creando organización/i }),
    ).toBeDisabled();
  });

  /**
   * Crear organizaciones ya no depende del plan: ni botón bloqueado, ni aviso, ni validación local
   * que impida enviar.
   */
  describe('sin restricción de plan', () => {
    it('envía la solicitud con la cuenta activa en plan Free', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        billingByAccountId: {
          [ACCOUNT_ID]: buildBillingAccess({
            currentPlanType: 'free',
            hasActiveSubscription: false,
            actions: { organizationAccount: false },
          }),
        },
      });
      renderWithProviders(<CreateOrganizationForm />);

      await fillForm(user);
      const submitButton = screen.getByRole('button', {
        name: /crear organización/i,
      });
      expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
      await user.click(submitButton);

      expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('envía la solicitud aunque todavía no se conozca el estado comercial', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await fillForm(user);
      await user.type(screen.getByLabelText(/razón social/i), '{Enter}');

      expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('ya no muestra el aviso "No disponible en plan Free"', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await user.hover(
        screen.getByRole('button', { name: /crear organización/i }),
      );

      expect(
        screen.queryByText('No disponible en plan Free'),
      ).not.toBeInTheDocument();
    });
  });
});
