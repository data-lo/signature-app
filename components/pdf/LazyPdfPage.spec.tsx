import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import LazyPdfPage, { renderedPageHeight } from './LazyPdfPage';

jest.mock('react-pdf', () => ({
  Page: ({ pageNumber, width }: { pageNumber: number; width: number }) => (
    <div>
      Página dibujada {pageNumber} a {width}px
    </div>
  ),
}));

/**
 * IntersectionObserver controlable: jsdom no lo implementa. Guarda cada instancia con sus
 * opciones para que la prueba decida cuándo una página entra o sale del área cercana.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  constructor(
    public callback: IntersectionObserverCallback,
    public options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const LETTER = { width: 612, height: 792 };

describe('LazyPdfPage', () => {
  const originalObserver = global.IntersectionObserver;

  afterEach(() => {
    global.IntersectionObserver = originalObserver;
    FakeIntersectionObserver.instances = [];
  });

  it('reserva el alto de la hoja con su proporción, sin dibujarla', () => {
    expect(renderedPageHeight(LETTER, 520)).toBe(673);
    expect(renderedPageHeight({ width: 792, height: 612 }, 520)).toBe(402);
  });

  describe('con IntersectionObserver', () => {
    beforeEach(() => {
      global.IntersectionObserver =
        FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    });

    it('lejos del área visible muestra el recuadro de reserva del tamaño de la hoja', () => {
      const scrollRootRef = createRef<HTMLDivElement>();
      const { container } = render(
        <LazyPdfPage
          pageNumber={7}
          width={520}
          size={LETTER}
          scrollRootRef={scrollRootRef}
        />,
      );

      expect(screen.getByText('Página 7')).toBeInTheDocument();
      expect(screen.queryByText(/página dibujada/i)).not.toBeInTheDocument();
      expect(
        (container.firstChild as HTMLElement).style.minHeight,
      ).toBe('673px');
    });

    it('se dibuja al acercarse y se desmonta al alejarse, liberando su canvas', () => {
      render(
        <LazyPdfPage
          pageNumber={2}
          width={520}
          size={LETTER}
          scrollRootRef={createRef<HTMLDivElement>()}
        />,
      );
      const observer = FakeIntersectionObserver.instances[0];

      act(() => observer.trigger(true));
      expect(screen.getByText('Página dibujada 2 a 520px')).toBeInTheDocument();

      act(() => observer.trigger(false));
      expect(screen.queryByText(/página dibujada/i)).not.toBeInTheDocument();
    });

    it('observa contra el contenedor con scroll del visor, con margen para dibujar por adelantado', () => {
      const root = document.createElement('div');
      const scrollRootRef = { current: root };

      render(
        <LazyPdfPage
          pageNumber={1}
          width={520}
          size={LETTER}
          scrollRootRef={scrollRootRef}
        />,
      );

      const { options } = FakeIntersectionObserver.instances[0];
      expect(options.root).toBe(root);
      expect(options.rootMargin).toBe('150% 0px');
    });
  });

  it('sin IntersectionObserver dibuja la página directamente (comportamiento anterior)', () => {
    // @ts-expect-error — se simula un entorno sin la API.
    delete global.IntersectionObserver;

    render(
      <LazyPdfPage
        pageNumber={3}
        width={400}
        size={LETTER}
        scrollRootRef={createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByText('Página dibujada 3 a 400px')).toBeInTheDocument();
  });
});
