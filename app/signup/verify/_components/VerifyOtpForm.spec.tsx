import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import VerifyOtpForm from './VerifyOtpForm';
import {
  getPendingRegistrationContext,
  setPendingRegistrationContext,
  clearPendingRegistrationContext,
} from '@/lib/pending-registration-context';
import { verifyOtpRequest, resendOtpRequest } from '../../_requests';
import { setAuthToken } from '@/lib/cookies';

jest.mock('@/lib/pending-registration-context');
jest.mock('../../_requests');
jest.mock('@/lib/cookies');

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const mockedGetPendingRegistrationContext =
  getPendingRegistrationContext as jest.Mock;
const mockedSetPendingRegistrationContext =
  setPendingRegistrationContext as jest.Mock;
const mockedClearPendingRegistrationContext =
  clearPendingRegistrationContext as jest.Mock;
const mockedVerifyOtpRequest = verifyOtpRequest as jest.Mock;
const mockedResendOtpRequest = resendOtpRequest as jest.Mock;
const mockedSetAuthToken = setAuthToken as jest.Mock;

describe('VerifyOtpForm', () => {
  beforeEach(() => {
    replace.mockReset();
    mockedGetPendingRegistrationContext.mockReset().mockReturnValue({
      email: 'ana@empresa.com',
      maskedEmail: 'a***a@empresa.com',
      isNewPreRegistration: true,
    });
    mockedSetPendingRegistrationContext.mockReset();
    mockedClearPendingRegistrationContext.mockReset();
    mockedVerifyOtpRequest.mockReset();
    mockedResendOtpRequest.mockReset();
    mockedSetAuthToken.mockReset();
  });

  it('sin contexto pendiente, redirige a /signup en vez de mostrar el formulario', () => {
    mockedGetPendingRegistrationContext.mockReturnValue(null);

    renderWithProviders(<VerifyOtpForm />);

    expect(replace).toHaveBeenCalledWith('/signup');
    expect(screen.queryByText(/verifica tu correo/i)).not.toBeInTheDocument();
  });

  it('muestra el correo enmascarado del contexto', () => {
    renderWithProviders(<VerifyOtpForm />);

    expect(screen.getAllByText(/a\*\*\*a@empresa\.com/).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByText(/ya existía una solicitud/i),
    ).not.toBeInTheDocument();
  });

  it('Caso A (isNewPreRegistration:false): muestra el aviso de solicitud pendiente reenviada', () => {
    mockedGetPendingRegistrationContext.mockReturnValue({
      email: 'original@empresa.com',
      maskedEmail: 'o***l@empresa.com',
      isNewPreRegistration: false,
    });

    renderWithProviders(<VerifyOtpForm />);

    expect(screen.getByText(/ya existía una solicitud/i)).toBeInTheDocument();
  });

  it('valida que el código tenga 6 dígitos numéricos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyOtpForm />);

    await user.type(screen.getByLabelText(/código de verificación/i), 'abc');
    await user.click(screen.getByRole('button', { name: /^verificar$/i }));

    expect(
      await screen.findByText(/el código debe tener 6 dígitos/i),
    ).toBeInTheDocument();
    expect(mockedVerifyOtpRequest).not.toHaveBeenCalled();
  });

  it('al verificar exitosamente, guarda el token y limpia el contexto de pre-registro', async () => {
    mockedVerifyOtpRequest.mockResolvedValue({
      user: { id: 'user-1' },
      token: 'jwt-1',
    });
    const user = userEvent.setup();
    renderWithProviders(<VerifyOtpForm />);

    await user.type(
      screen.getByLabelText(/código de verificación/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /^verificar$/i }));

    await waitFor(() =>
      expect(mockedVerifyOtpRequest).toHaveBeenCalledWith(
        'ana@empresa.com',
        '123456',
      ),
    );
    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-1');
    expect(mockedClearPendingRegistrationContext).toHaveBeenCalled();
  });

  it('muestra el error del backend si el código es inválido', async () => {
    mockedVerifyOtpRequest.mockRejectedValue({
      response: { data: { message: 'Código de verificación inválido' } },
    });
    const user = userEvent.setup();
    renderWithProviders(<VerifyOtpForm />);

    await user.type(
      screen.getByLabelText(/código de verificación/i),
      '000000',
    );
    await user.click(screen.getByRole('button', { name: /^verificar$/i }));

    expect(
      await screen.findByText(/código de verificación inválido/i),
    ).toBeInTheDocument();
  });

  it('reenvía el código y actualiza el correo enmascarado mostrado', async () => {
    mockedResendOtpRequest.mockResolvedValue({
      email: 'ana@empresa.com',
      maskedEmail: 'a***a@empresa.com',
    });
    const user = userEvent.setup();
    renderWithProviders(<VerifyOtpForm />);

    await user.click(screen.getByRole('button', { name: /reenviar código/i }));

    await waitFor(() =>
      expect(mockedResendOtpRequest).toHaveBeenCalledWith('ana@empresa.com'),
    );
    expect(mockedSetPendingRegistrationContext).toHaveBeenCalledWith({
      email: 'ana@empresa.com',
      maskedEmail: 'a***a@empresa.com',
      isNewPreRegistration: false,
    });
    expect(
      await screen.findByText(/te reenviamos un nuevo código/i),
    ).toBeInTheDocument();
  });
});
