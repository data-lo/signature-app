import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TurnstileWidget, type TurnstileWidgetHandle } from './turnstile-widget';

const SITE_KEY = 'site-key-de-prueba';

type TurnstileCallbacks = {
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

/**
 * El script real de Cloudflare no se descarga en jsdom; se instala en `window` el objeto que ese
 * script publicaría, que es contra lo que habla el componente.
 */
function stubTurnstile() {
  const rendered: { options?: TurnstileCallbacks } = {};
  const api = {
    render: jest.fn((_container: HTMLElement, options: TurnstileCallbacks) => {
      rendered.options = options;
      return 'widget-1';
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
});
