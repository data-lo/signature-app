import { useImperativeHandle } from 'react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import SignupForm from './SignupForm';
import { useRegister } from '../_hooks/useRegister';

jest.mock('../_hooks/useRegister');

const SITE_KEY = 'site-key-de-prueba';
const TURNSTILE_TOKEN = 'token-de-turnstile';

// El widget real descarga el script de Cloudflare y pinta un iframe: acá se sustituye por un
// botón que entrega un token, que es lo único que el formulario necesita de él. `reset` queda
// espiable para comprobar que el CAPTCHA se reinicia cuando el registro falla.
const turnstileReset = jest.fn();

jest.mock('@/components/form/turnstile-widget', () => ({
  TurnstileWidget: ({
    onVerify,
    ref,
  }: {
    onVerify: (token: string) => void;
    ref?: React.Ref<{ reset: () => void }>;
  }) => {
    useImperativeHandle(ref, () => ({ reset: turnstileReset }));
    return (
      <button type="button" onClick={() => onVerify(TURNSTILE_TOKEN)}>
        resolver captcha
      </button>
    );
  },
}));

/** Llena todos los campos con datos válidos; el CAPTCHA se resuelve aparte, según el caso. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
  await user.type(screen.getByLabelText(/apellidos/i), 'Pérez');
  await user.type(
    screen.getByLabelText(/correo electrónico/i),
    'juan.perez@empresa.com',
  );
  await user.type(screen.getByLabelText(/curp/i), 'PELJ850101HDFRNN08');
  await user.type(screen.getByLabelText(/^rfc$/i), 'PELJ850101ABC');
  await user.type(screen.getByLabelText(/^contraseña$/i), 'supersecret123');
  await user.type(
    screen.getByLabelText(/confirmar contraseña/i),
    'supersecret123',
  );
}

const mockedUseRegister = useRegister as jest.Mock;

describe('SignupForm', () => {
  const mutate = jest.fn();
  let registerOptions: { onError?: () => void } | undefined;

  beforeEach(() => {
    mutate.mockReset();
    turnstileReset.mockReset();
    mockedUseRegister.mockImplementation((options) => {
      registerOptions = options;
      return {
        mutate,
        isPending: false,
        isError: false,
        error: null,
      };
    });
  });

  it('muestra un error de validación si el RFC es demasiado corto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm turnstileSiteKey={SITE_KEY} />);

    await user.type(screen.getByLabelText(/^rfc$/i), 'CORTO');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(
      await screen.findByText(/el rfc debe tener 12 o 13 caracteres/i),
    ).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envía todos los campos, incluido el RFC y el token del CAPTCHA, cuando el formulario es válido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm turnstileSiteKey={SITE_KEY} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /resolver captcha/i }));
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@empresa.com',
        nationalId: 'PELJ850101HDFRNN08',
        rfc: 'PELJ850101ABC',
        turnstileToken: TURNSTILE_TOKEN,
      }),
    );
  });

  it('prellena el RFC cuando viene de /join (defaultRfc)', () => {
    renderWithProviders(
      <SignupForm defaultRfc="XAXX010101000" turnstileSiteKey={SITE_KEY} />,
    );

    expect(screen.getByLabelText(/^rfc$/i)).toHaveValue('XAXX010101000');
  });

  it('incluye invitationToken en el envío cuando viene de /join', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SignupForm
        defaultRfc="PELJ850101ABC"
        invitationToken="invite-token-1"
        turnstileSiteKey={SITE_KEY}
      />,
    );

    await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
    await user.type(screen.getByLabelText(/apellidos/i), 'Pérez');
    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'juan.perez@empresa.com',
    );
    await user.type(screen.getByLabelText(/curp/i), 'PELJ850101HDFRNN08');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'supersecret123');
    await user.type(
      screen.getByLabelText(/confirmar contraseña/i),
      'supersecret123',
    );
    await user.click(screen.getByRole('button', { name: /resolver captcha/i }));
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ invitationToken: 'invite-token-1' }),
    );
  });

  // El criterio de aceptación "el usuario completa el CAPTCHA antes de enviar el formulario":
  // con todo lo demás correcto, el registro no sale hasta que hay token.
  it('no envía el registro mientras el CAPTCHA no esté resuelto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm turnstileSiteKey={SITE_KEY} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(mutate).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/completa la verificación anti-bots/i),
    ).toBeInTheDocument();
  });

  // El token de Turnstile es de un solo uso: sin reiniciar el widget, el segundo intento
  // mandaría el mismo token quemado y el backend lo rechazaría siempre.
  it('reinicia el CAPTCHA cuando el registro falla', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm turnstileSiteKey={SITE_KEY} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /resolver captcha/i }));
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    registerOptions?.onError?.();
    expect(turnstileReset).toHaveBeenCalled();

    // Y el token queda descartado: reintentar sin resolver el reto nuevo no vuelve a enviar.
    mutate.mockClear();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
    expect(mutate).not.toHaveBeenCalled();
  });
  /**
   * Historia "Capitalizar nombre y apellido": la normalización tiene que ocurrir sobre lo que
   * se envía, no sólo cuando el campo pierde el foco. El `onBlur` del campo da el efecto
   * inmediato mientras se teclea, pero no cubre enviar con Enter sin salir del campo, el
   * autocompletado del navegador ni pegar y enviar. Estas pruebas escriben en el último campo y
   * envían desde ahí, así que los campos de nombre nunca se vuelven a enfocar y lo único que
   * puede capitalizar es el esquema.
   */
  describe('capitalización del nombre y el apellido', () => {
    async function submitWithNames(
      user: ReturnType<typeof userEvent.setup>,
      firstName: string,
      lastName: string,
    ) {
      renderWithProviders(<SignupForm turnstileSiteKey={SITE_KEY} />);

      await user.type(screen.getByLabelText(/nombre\(s\)/i), firstName);
      await user.type(screen.getByLabelText(/apellidos/i), lastName);
      await user.type(
        screen.getByLabelText(/correo electrónico/i),
        'juan.perez@empresa.com',
      );
      await user.type(screen.getByLabelText(/curp/i), 'PELJ850101HDFRNN08');
      await user.type(screen.getByLabelText(/^rfc$/i), 'PELJ850101ABC');
      await user.type(
        screen.getByLabelText(/^contraseña$/i),
        'supersecret123',
      );
      await user.type(
        screen.getByLabelText(/confirmar contraseña/i),
        'supersecret123',
      );
      await user.click(
        screen.getByRole('button', { name: /resolver captcha/i }),
      );
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
    }

    it.each([
      ['nombre compuesto', 'juan carlos', 'pérez', 'Juan Carlos', 'Pérez'],
      [
        'apellido compuesto',
        'ana',
        'de la cruz mendoza',
        'Ana',
        'De La Cruz Mendoza',
      ],
      [
        'valores en mayúsculas',
        'MARÍA DEL CARMEN',
        'GÓMEZ',
        'María Del Carmen',
        'Gómez',
      ],
      [
        'espacios adicionales',
        '  ana   maria  ',
        '  lopez   soto ',
        'Ana Maria',
        'Lopez Soto',
      ],
    ])(
      'envía capitalizado con %s',
      async (_caso, firstName, lastName, expectedFirst, expectedLast) => {
        const user = userEvent.setup();

        await submitWithNames(user, firstName, lastName);

        expect(mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: expectedFirst,
            lastName: expectedLast,
          }),
        );
      },
    );

    /** Los demás campos conservan su tratamiento: el CURP y el RFC no se capitalizan. */
    it('no altera el resto de los campos', async () => {
      const user = userEvent.setup();

      await submitWithNames(user, 'ana', 'lopez');

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'juan.perez@empresa.com',
          nationalId: 'PELJ850101HDFRNN08',
          rfc: 'PELJ850101ABC',
        }),
      );
    });
  });
});