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
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,x');
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
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
  });
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
