import '@testing-library/jest-dom';

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
