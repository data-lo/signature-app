import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurnstileWidget, type TurnstileWidgetHandle } from './turnstile-widget';

const SITE_KEY = 'site-key-de-prueba';

type TurnstileCallbacks = {
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': (code?: string) => void;
};

/**
 * El script real de Cloudflare no se descarga en jsdom; se instala en `window` el objeto que ese
 * script publicaría, que es contra lo que habla el componente.
 *
 * `renderResult` permite simular los rechazos de Cloudflare: `render` devuelve `undefined` cuando
 * la clave no está autorizada para el dominio. Se pasa `null` para pedir ese caso — `undefined`
 * activaría el valor por defecto del parámetro.
 */
function stubTurnstile(renderResult: string | null = 'widget-1') {
  const rendered: { options?: TurnstileCallbacks } = {};
  const api = {
    render: jest.fn((_container: HTMLElement, options: TurnstileCallbacks) => {
      rendered.options = options;
      return renderResult ?? undefined;
    }),
    reset: jest.fn(),
    remove: jest.fn(),
  };
  window.turnstile = api as unknown as typeof window.turnstile;
  return { api, rendered };
}

describe('TurnstileWidget', () => {
  afterEach(() => {
    delete window.turnstile;
  });

  it('entrega el token al resolverse el reto', async () => {
    const { rendered } = stubTurnstile();
    const onVerify = jest.fn();
    render(<TurnstileWidget siteKey={SITE_KEY} onVerify={onVerify} />);

    await waitFor(() => expect(rendered.options).toBeDefined());
    rendered.options?.callback('token-1');

    expect(onVerify).toHaveBeenCalledWith('token-1');
  });

  it('avisa cuando el reto expira, para que el formulario descarte el token', async () => {
    const { rendered } = stubTurnstile();
    const onExpire = jest.fn();
    render(
      <TurnstileWidget
        siteKey={SITE_KEY}
        onVerify={jest.fn()}
        onExpire={onExpire}
      />,
    );

    await waitFor(() => expect(rendered.options).toBeDefined());
    rendered.options?.['expired-callback']();

    expect(onExpire).toHaveBeenCalled();
  });

  it('reset() pide un reto nuevo al widget montado', async () => {
    const { api } = stubTurnstile();
    const ref = createRef<TurnstileWidgetHandle>();
    render(
      <TurnstileWidget ref={ref} siteKey={SITE_KEY} onVerify={jest.fn()} />,
    );

    await waitFor(() => expect(api.render).toHaveBeenCalled());
    ref.current?.reset();

    expect(api.reset).toHaveBeenCalledWith('widget-1');
  });

  // Sin clave configurada no hay reto posible, y el formulario va a bloquear el envío: el aviso
  // en pantalla es lo que evita que el usuario vea un botón que "no hace nada".
  it('muestra un aviso si no hay clave del sitio configurada', () => {
    const { api } = stubTurnstile();
    render(<TurnstileWidget onVerify={jest.fn()} />);

    expect(
      screen.getByText(/no se pudo cargar la verificación anti-bots/i),
    ).toBeInTheDocument();
    expect(api.render).not.toHaveBeenCalled();
  });

  /**
   * El fallo reportado: el reto de Cloudflare termina en error (extensión de privacidad, VPN, red
   * inestable) y el usuario se quedaba mirando un widget en error, con el botón de envío
   * pidiéndole "completa la verificación" y sin ninguna forma de reintentar salvo recargar.
   */
  describe('recuperación cuando el reto falla', () => {
    it('avisa y ofrece reintentar cuando Cloudflare reporta un error en el reto', async () => {
      const { api, rendered } = stubTurnstile();
      const onError = jest.fn();
      render(
        <TurnstileWidget
          siteKey={SITE_KEY}
          onVerify={jest.fn()}
          onError={onError}
        />,
      );

      await waitFor(() => expect(rendered.options).toBeDefined());
      // Cloudflare invoca el callback desde su iframe: `act` es solo para que React no avise
      // de una actualización de estado fuera de su ciclo.
      act(() => rendered.options?.['error-callback']('600010'));

      expect(onError).toHaveBeenCalled();
      expect(
        await screen.findByText(/no pudo completarse/i),
      ).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: /reintentar verificación/i }),
      );

      // Hay widget montado: el reintento le pide un reto nuevo en vez de rehacerlo desde cero.
      expect(api.reset).toHaveBeenCalledWith('widget-1');
      expect(screen.queryByText(/no pudo completarse/i)).not.toBeInTheDocument();
    });

    // Cloudflare devuelve `undefined` cuando la clave no está autorizada para el dominio. Antes
    // esto dejaba el contenedor vacío, sin aviso y sin manera de saber qué pasaba.
    it('avisa si el widget no llega a montarse', async () => {
      const { api } = stubTurnstile(null);
      const onError = jest.fn();
      render(
        <TurnstileWidget
          siteKey={SITE_KEY}
          onVerify={jest.fn()}
          onError={onError}
        />,
      );

      expect(
        await screen.findByText(/no se pudo cargar la verificación anti-bots/i),
      ).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();

      // Sin widget montado no hay nada que reiniciar: el reintento vuelve a montarlo.
      api.render.mockClear();
      await userEvent.click(
        screen.getByRole('button', { name: /reintentar verificación/i }),
      );

      expect(api.reset).not.toHaveBeenCalled();
      await waitFor(() => expect(api.render).toHaveBeenCalled());
    });

    // `remove` lanza si Cloudflare ya descartó el widget (StrictMode, Fast Refresh): desmontar el
    // formulario no debe tumbar la página.
    it('sobrevive a que Cloudflare rechace el remove al desmontar', async () => {
      const { api } = stubTurnstile();
      api.remove.mockImplementation(() => {
        throw new Error('Invalid widget ID');
      });

      const { unmount } = render(
        <TurnstileWidget siteKey={SITE_KEY} onVerify={jest.fn()} />,
      );
      await waitFor(() => expect(api.render).toHaveBeenCalled());

      expect(() => unmount()).not.toThrow();
    });
  });
});
