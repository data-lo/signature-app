import '@testing-library/jest-dom';

/**
 * `next/cache` no se puede cargar en jsdom: arrastra los internos del servidor de Next y revienta
 * al importarse. Llega hasta aquí por las Server Actions, que en producción son un stub de RPC en
 * el cliente pero en jest se resuelven como módulos normales — así que cualquier componente que
 * importe un hook que importe una Server Action tumbaría su suite entera, sin que la prueba tenga
 * nada que ver con la revalidación.
 *
 * Se dobla globalmente, junto al resto de los huecos de jsdom, en vez de repetirlo en cada
 * archivo: quien necesite comprobar que se revalidó algo lo espía sobre este doble.
 */
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

// jsdom no implementa ResizeObserver; los popups de @base-ui/react (Select,
// Popover, dropdown-menu) lo usan para calcular su posición y sin este stub
// se quedan montados con `hidden`/`data-closed` aunque se hayan "abierto".
global.ResizeObserver =
  global.ResizeObserver ??
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// jsdom tampoco implementa PointerEvent (ni los métodos de captura de
// puntero en Element) — @base-ui/react abre sus popups escuchando
// pointerdown/pointerup, así que sin esto los triggers de Select/Popover
// nunca cambian a data-open en los tests, aunque userEvent.click() "funcione".
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// jsdom no implementa document.elementFromPoint — el InputOTP de shadcn/ui (paquete
// input-otp) lo usa internamente para detectar si un gestor de contraseñas del navegador
// (1Password/LastPass) le superpuso un ícono, y sin este stub el timer interno revienta.
if (typeof document !== 'undefined') {
  document.elementFromPoint ??= () => null;
}
