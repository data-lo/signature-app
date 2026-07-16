import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import CreateOrganizationForm from './CreateOrganizationForm';
import { useCreateOrganization } from '../_hooks/useCreateOrganization';

jest.mock('../_hooks/useCreateOrganization');

const mockedUseCreateOrganization = useCreateOrganization as jest.Mock;

describe('CreateOrganizationForm', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseCreateOrganization.mockReturnValue({
      mutate,
      isPending: false,
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
});
