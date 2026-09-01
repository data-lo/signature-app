import { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import SignaturePad, { type SignaturePadHandle } from './SignaturePad';

/**
 * jsdom no implementa el contexto 2D del canvas, así que se sustituye por un doble que registra
 * las llamadas. Lo que se comprueba aquí es la lógica del componente —cuándo hay trazo, qué se
 * exporta, cómo se limpia—, no que el navegador sepa pintar una curva.
 */
function stubCanvas(opaquePixels: boolean) {
  const context = {
    scale: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    clearRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    /**
     * El búfer se dimensiona al tamaño pedido, no a un tamaño fijo: la exportación recorre el
     * canvas entero, y un array más corto dejaría índices en `undefined` —que no es 0— haciendo
     * pasar por opaco un canvas vacío.
     */
    getImageData: jest.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(
        Array.from({ length: w * h * 4 }, (_, i) =>
          (i + 1) % 4 === 0 ? (opaquePixels ? 255 : 0) : 0,
        ),
      ),
    })),
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
  };

  HTMLCanvasElement.prototype.getContext = jest
    .fn()
    .mockReturnValue(context) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 300,
    height: 200,
    right: 300,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => '',
  }));
  HTMLCanvasElement.prototype.toDataURL = jest.fn(
    () => 'data:image/png;base64,x',
  );
  HTMLCanvasElement.prototype.toBlob = jest.fn(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(new Blob(['png'], { type: 'image/png' }));
  }) as never;

  return context;
}

function drawStroke(canvas: HTMLElement) {
  // `setPointerCapture` tampoco existe en jsdom.
  Object.assign(canvas, {
    setPointerCapture: jest.fn(),
    releasePointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(() => true),
  });

  act(() => {
    canvas.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      }),
    );
  });
}

/** Evento de puntero con id: jsdom no implementa `PointerEvent`, así que se completa a mano. */
function pointerEvent(
  type: string,
  {
    x,
    y,
    pointerId = 1,
    coalesced,
  }: {
    x: number;
    y: number;
    pointerId?: number;
    coalesced?: { x: number; y: number }[];
  },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
  });
  Object.assign(event, { pointerId });
  if (coalesced) {
    Object.assign(event, {
      getCoalescedEvents: () =>
        coalesced.map((point) => ({ clientX: point.x, clientY: point.y })),
    });
  }
  return event;
}

function preparePointerCapture(canvas: HTMLElement) {
  Object.assign(canvas, {
    setPointerCapture: jest.fn(),
    releasePointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(() => true),
  });
}

/** Dibuja un trazo completo: apoyar, arrastrar por cada punto, levantar. */
function drawPath(
  canvas: HTMLElement,
  points: { x: number; y: number }[],
  pointerId = 1,
) {
  preparePointerCapture(canvas);
  act(() => {
    canvas.dispatchEvent(
      pointerEvent('pointerdown', { ...points[0], pointerId }),
    );
    for (const point of points.slice(1)) {
      canvas.dispatchEvent(
        pointerEvent('pointermove', { ...point, pointerId }),
      );
    }
    canvas.dispatchEvent(
      pointerEvent('pointerup', { ...points[points.length - 1], pointerId }),
    );
  });
}

/**
 * Los tramos que quedaron dibujados, en orden: de dónde arranca cada uno y dónde termina.
 *
 * Se reconstruyen leyendo las llamadas al contexto en el orden real en que ocurrieron, que es lo
 * que un navegador ejecutaría. El `arc` inicial (el punto del apoyo) no es un tramo y se ignora.
 */
function strokeSegments(context: ReturnType<typeof stubCanvas>) {
  const orderOf = (mock: jest.Mock, i: number) =>
    mock.mock.invocationCallOrder[i];

  const moves = context.moveTo.mock.calls.map((args, i) => ({
    order: orderOf(context.moveTo, i),
    from: { x: args[0] as number, y: args[1] as number },
  }));

  const ends = [
    ...context.quadraticCurveTo.mock.calls.map((args, i) => ({
      order: orderOf(context.quadraticCurveTo, i),
      to: { x: args[2] as number, y: args[3] as number },
    })),
    ...context.lineTo.mock.calls.map((args, i) => ({
      order: orderOf(context.lineTo, i),
      to: { x: args[0] as number, y: args[1] as number },
    })),
  ].sort((a, b) => a.order - b.order);

  return moves.map((move, i) => ({ from: move.from, to: ends[i]?.to }));
}

describe('SignaturePad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.devicePixelRatio = 2;
  });

  it('empieza vacío: no hay nada que exportar', async () => {
    stubCanvas(false);
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);

    expect(ref.current?.isEmpty()).toBe(true);
    await expect(ref.current?.toPngBlob()).resolves.toBeNull();
  });

  it('un toque sin arrastrar ya cuenta como trazo: así se dibujan los puntos de una firma', () => {
    stubCanvas(true);
    const onStrokeChange = jest.fn();
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} onStrokeChange={onStrokeChange} />);

    drawStroke(screen.getByRole('img'));

    expect(ref.current?.isEmpty()).toBe(false);
    expect(onStrokeChange).toHaveBeenCalledWith(true);
  });

  it('exporta un PNG cuando hay trazo', async () => {
    stubCanvas(true);
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);

    drawStroke(screen.getByRole('img'));

    const blob = await ref.current?.toPngBlob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');
  });

  /**
   * El canvas nunca se rellena, así que un dibujo sin píxeles opacos significa que no quedó nada
   * visible. Subirlo guardaría una firma en blanco.
   */
  it('no exporta nada si el trazo no dejó píxeles visibles', async () => {
    stubCanvas(false);
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} />);

    drawStroke(screen.getByRole('img'));

    await expect(ref.current?.toPngBlob()).resolves.toBeNull();
  });

  it('limpiar deja el canvas vacío y lo avisa', () => {
    const context = stubCanvas(true);
    const onStrokeChange = jest.fn();
    const ref = createRef<SignaturePadHandle>();
    render(<SignaturePad ref={ref} onStrokeChange={onStrokeChange} />);

    drawStroke(screen.getByRole('img'));
    act(() => ref.current?.clear());

    expect(ref.current?.isEmpty()).toBe(true);
    expect(context.clearRect).toHaveBeenCalled();
    expect(onStrokeChange).toHaveBeenLastCalledWith(false);
  });

  /**
   * Historia "Corregir trazado punteado al dibujar firmas".
   *
   * El trazo salía cortado porque cada tramo arrancaba en la muestra cruda del puntero en vez del
   * punto medio anterior, dejando sin dibujar el pedazo entre uno y otro: la mitad del recorrido.
   * Lo que se comprueba acá es justamente eso —que los tramos se encadenan— y no que el navegador
   * sepa pintar una curva.
   */
  describe('continuidad del trazo', () => {
    const RECTA = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];

    it('encadena los tramos: cada uno empieza donde terminó el anterior', () => {
      const context = stubCanvas(true);
      render(<SignaturePad />);

      drawPath(screen.getByRole('img'), RECTA);

      const segments = strokeSegments(context);
      expect(segments.length).toBeGreaterThan(1);

      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].from).toEqual(segments[i - 1].to);
      }
    });

    /** Un trazo que no llega hasta donde se soltó el dedo termina antes de tiempo. */
    it('el trazo llega hasta el punto donde se levantó el puntero', () => {
      const context = stubCanvas(true);
      render(<SignaturePad />);

      drawPath(screen.getByRole('img'), RECTA);

      const segments = strokeSegments(context);
      expect(segments[segments.length - 1].to).toEqual(RECTA[RECTA.length - 1]);
    });

    /** Y arranca donde se apoyó: sin esto faltaría el principio de la firma. */
    it('el trazo arranca en el punto donde se apoyó el puntero', () => {
      const context = stubCanvas(true);
      render(<SignaturePad />);

      drawPath(screen.getByRole('img'), RECTA);

      expect(strokeSegments(context)[0].from).toEqual(RECTA[0]);
    });

    /**
     * Criterio "no se generan líneas que conecten trazos independientes": el segundo trazo tiene
     * que empezar donde se apoyó el dedo, no donde terminó el primero.
     */
    it('no une dos trazos separados con una línea', () => {
      const context = stubCanvas(true);
      render(<SignaturePad />);
      const canvas = screen.getByRole('img');

      drawPath(canvas, RECTA);
      const primeros = strokeSegments(context).length;

      drawPath(canvas, [
        { x: 200, y: 100 },
        { x: 210, y: 100 },
        { x: 220, y: 100 },
      ]);

      const segundos = strokeSegments(context).slice(primeros);
      expect(segundos[0].from).toEqual({ x: 200, y: 100 });
    });
  });

  /**
   * Criterio "el trazo conserva continuidad incluso cuando el usuario dibuja rápido": al dibujar
   * deprisa el navegador agrupa varios movimientos en un evento por cuadro y sólo entrega el resto
   * si se piden. Sin pedirlos, un gesto veloz se reconstruye con un puñado de muestras.
   */
  it('usa las muestras fusionadas del evento cuando el trazo es veloz', () => {
    const context = stubCanvas(true);
    render(<SignaturePad />);
    const canvas = screen.getByRole('img');
    preparePointerCapture(canvas);

    act(() => {
      canvas.dispatchEvent(pointerEvent('pointerdown', { x: 0, y: 0 }));
      // Un solo evento que trae tres muestras intermedias.
      canvas.dispatchEvent(
        pointerEvent('pointermove', {
          x: 30,
          y: 0,
          coalesced: [
            { x: 10, y: 0 },
            { x: 20, y: 0 },
            { x: 30, y: 0 },
          ],
        }),
      );
    });

    // Tres muestras, tres tramos — no uno solo que se salte el recorrido intermedio.
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(3);
  });

  /**
   * En un celular es normal que un segundo dedo o el canto de la mano toquen la pantalla a media
   * firma. Sin filtrarlos, sus eventos entran al mismo trazo y dibujan una raya desde donde iba la
   * firma hasta donde aterrizó el otro contacto.
   */
  it('ignora un segundo puntero mientras hay un trazo en curso', () => {
    const context = stubCanvas(true);
    render(<SignaturePad />);
    const canvas = screen.getByRole('img');
    preparePointerCapture(canvas);

    act(() => {
      canvas.dispatchEvent(
        pointerEvent('pointerdown', { x: 0, y: 0, pointerId: 1 }),
      );
      canvas.dispatchEvent(
        pointerEvent('pointermove', { x: 10, y: 0, pointerId: 1 }),
      );
      // Segundo contacto, lejos: ni apoya ni arrastra.
      canvas.dispatchEvent(
        pointerEvent('pointerdown', { x: 250, y: 150, pointerId: 2 }),
      );
      canvas.dispatchEvent(
        pointerEvent('pointermove', { x: 260, y: 150, pointerId: 2 }),
      );
    });

    const destinos = context.quadraticCurveTo.mock.calls.map((args) => args[2]);
    expect(destinos.every((x) => (x as number) < 100)).toBe(true);
  });

  /**
   * Con el puntero capturado, `pointerup` llega igual aunque el dedo esté fuera del canvas. Cerrar
   * el trazo al rozar el borde lo partía en dos justo cuando se firma rápido.
   */
  it('no corta el trazo cuando el puntero sale del área', () => {
    const context = stubCanvas(true);
    render(<SignaturePad />);
    const canvas = screen.getByRole('img');
    preparePointerCapture(canvas);

    act(() => {
      canvas.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }));
      canvas.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 10 }));
      // React sintetiza `onPointerLeave` a partir de `pointerout` con un relatedTarget fuera
      // del elemento; un `pointerleave` crudo no lo dispara y la prueba pasaría siempre.
      const out = new MouseEvent('pointerout', {
        bubbles: true,
        // `relatedTarget` es de sólo lectura: se pasa al construir, no se asigna después.
        relatedTarget: document.body,
      });
      Object.assign(out, { pointerId: 1 });
      canvas.dispatchEvent(out);
      canvas.dispatchEvent(pointerEvent('pointermove', { x: 30, y: 10 }));
    });

    // El movimiento posterior al `pointerleave` se sigue dibujando.
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(2);
  });

  /**
   * En el celular la barra de direcciones aparece y desaparece al desplazar, y cada `resize`
   * rehacía el búfer: el trazo se borraba y se repintaba de forma asíncrona, con parpadeo, y a
   * media firma el repintado podía pisar lo recién dibujado.
   */
  it('no rehace el canvas si el tamaño no cambió', () => {
    const context = stubCanvas(true);
    render(<SignaturePad />);
    const llamadasIniciales = context.scale.mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
    });

    expect(context.scale).toHaveBeenCalledTimes(llamadasIniciales);
  });

  /** Sin esto el trazo se ve borroso en los celulares, que es donde más se va a usar. */
  it('escala el canvas a la densidad de la pantalla', () => {
    const context = stubCanvas(true);
    render(<SignaturePad />);

    expect(context.scale).toHaveBeenCalledWith(2, 2);
  });

  /** Sin `touch-action: none`, arrastrar el dedo desplaza la página en vez de dibujar. */
  it('desactiva los gestos táctiles del navegador sobre el canvas', () => {
    stubCanvas(true);
    render(<SignaturePad />);

    // Se lee del atributo `style`: jsdom no resuelve `touch-action` en estilos computados.
    expect(screen.getByRole('img').style.touchAction).toBe('none');
  });
});
