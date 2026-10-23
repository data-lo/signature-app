import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test-utils';
import type { CurrentUser } from '@/lib/api/auth';
import UserInfoCard from './UserInfoCard';
import { useUpdatePersonalInformation } from '../_hooks/useUpdatePersonalInformation';

jest.mock('../_hooks/useUpdatePersonalInformation');

const mockedUseUpdatePersonalInformation =
  useUpdatePersonalInformation as jest.Mock;

const user = {
  firstName: 'Ana',
  lastName: 'Ruiz',
  email: 'ana@correo.com',
  nationalId: 'RUAA800101MDFRRN09',
  rfc: null,
  phoneNumber: '5512345678',
  secondaryEmail: 'ana.alterno@correo.com',
} as unknown as CurrentUser;

/** Historia "Evitar redirección a Documentos al guardar información personal". */
describe('UserInfoCard', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseUpdatePersonalInformation.mockReturnValue({
      mutate,
      isPending: false,
    });
  });

  it('guarda los datos de contacto editados', async () => {
    const userEventSetup = userEvent.setup();
    renderWithProviders(<UserInfoCard user={user} />);

    const phone = screen.getByLabelText(/teléfono/i);
    await userEventSetup.clear(phone);
    await userEventSetup.type(phone, '5598765432');
    await userEventSetup.click(
      screen.getByRole('button', { name: /guardar cambios/i }),
    );

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '5598765432' }),
    );
  });

  it('mientras guarda, deshabilita el botón y no vuelve a enviar', async () => {
    mockedUseUpdatePersonalInformation.mockReturnValue({
      mutate,
      isPending: true,
    });
    const userEventSetup = userEvent.setup();
    renderWithProviders(<UserInfoCard user={user} />);

    const phone = screen.getByLabelText(/teléfono/i);
    await userEventSetup.clear(phone);
    await userEventSetup.type(phone, '5598765432');

    const button = screen.getByRole('button', { name: /guardando/i });
    expect(button).toBeDisabled();

    // El envío con Enter desde un campo no pasa por el botón deshabilitado.
    fireEvent.submit(phone.closest('form')!);
    await screen.findByRole('button', { name: /guardando/i });

    expect(mutate).not.toHaveBeenCalled();
  });
});
