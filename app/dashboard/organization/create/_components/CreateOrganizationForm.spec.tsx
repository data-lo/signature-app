import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import CreateOrganizationForm from './CreateOrganizationForm';
import { useCreateOrganization } from '../_hooks/useCreateOrganization';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { ORGANIZATION_ACCOUNT_TOOLTIP } from '@/lib/hooks/useCanCreateOrganization';

jest.mock('../_hooks/useCreateOrganization');

const mockedUseCreateOrganization = useCreateOrganization as jest.Mock;

const ACCOUNT_ID = 'account-1';

/**
 * A esta pantalla se puede llegar escribiendo la URL, así que el formulario mira el plan de la
 * cuenta activa igual que el menú que lleva hasta él (ver `useCanCreateOrganization`).
 */
function setBilling(organizationAccount: boolean) {
  useAuthStore.setState({
    activeAccount: {
      id: ACCOUNT_ID,
      accountType: 'PERSONAL',
      organizationId: null,
      roleId: 'OWNER',
    },
    billingByAccountId: {
      [ACCOUNT_ID]: buildBillingAccess({
        currentPlanType: organizationAccount ? 'plus' : 'free',
        actions: { organizationAccount },
      }),
    },
  });
}

async function llenarFormulario(user: ReturnType<typeof userEvent.setup>) {
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
    setBilling(true);
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

    await user.type(
      screen.getByLabelText(/nombre de visualización/i),
      'Acme',
    );
    await user.type(
      screen.getByLabelText(/razón social/i),
      'Acme Corp S.A. de C.V.',
    );
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

  describe('cuando el plan no incluye la cuenta empresarial', () => {
    beforeEach(() => {
      setBilling(false);
    });

    /**
     * `aria-disabled` y no `disabled`: un botón deshabilitado de verdad no recibe puntero ni
     * foco, y el tooltip que explica el bloqueo no se vería nunca.
     */
    it('deja el botón deshabilitado aunque el formulario sea válido', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await llenarFormulario(user);

      expect(
        screen.getByRole('button', { name: /crear organización/i }),
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('explica el bloqueo al pasar el cursor', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await user.hover(
        screen.getByRole('button', { name: /crear organización/i }),
      );

      expect(
        await screen.findByText(ORGANIZATION_ACCOUNT_TOOLTIP),
      ).toBeInTheDocument();
    });

    it('no envía nada al pulsar el botón', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await llenarFormulario(user);
      await user.click(
        screen.getByRole('button', { name: /crear organización/i }),
      );

      expect(mutate).not.toHaveBeenCalled();
    });

    /** El botón no es la única forma de enviar: Enter en un campo también dispara el submit. */
    it('tampoco envía al pulsar Enter en un campo', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm />);

      await llenarFormulario(user);
      await user.type(screen.getByLabelText(/razón social/i), '{Enter}');

      expect(mutate).not.toHaveBeenCalled();
    });
  });
});
