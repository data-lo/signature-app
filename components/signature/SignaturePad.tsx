'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

/**
 * Canvas para dibujar una rúbrica a mano, compartido por la pantalla de escritorio y la del
 * celular.
 *
 * **Por qué no se usa una librería.** El trazo que hace falta son unas cuantas líneas de Pointer
 * Events y una interpolación cuadrática; traer un paquete para eso sumaría superficie de
 * dependencias a un repositorio que la cuida deliberadamente (ver `VerificationQrPanel`, que
 * eligió `qrcode.react` justamente por declarar cero dependencias).
 *
 * **Un solo tipo de evento para todos los dispositivos.** Pointer Events unifica mouse, trackpad,
 * stylus y dedo, así que no hay tres caminos que mantener ni el clásico desajuste entre `mouse*`
 * y `touch*`. `touch-action: none` en el canvas es imprescindible en el celular: sin él, arrastrar
 * el dedo desplaza la página en vez de dibujar.
 *
 * **Cómo se traza.** Los puntos que reporta el puntero son muestras sueltas: unirlas con rectas
 * deja una firma con una esquina en cada muestra. El suavizado estándar es la curva cuadrática de
 * punto medio: cada tramo va del punto medio ANTERIOR al punto medio ACTUAL, usando la muestra
 * cruda de en medio como punto de control. Los tramos comparten extremo —el punto medio— y por eso
 * el trazo sale continuo y sin quiebres.
 *
 * Esa continuidad depende de que el tramo arranque en el punto medio anterior y no en la muestra
 * cruda. Empezarlo en la muestra deja sin dibujar el tramo que va del punto medio a la muestra
 * siguiente, o sea la mitad del recorrido, y la firma se ve punteada aunque cada tramo por
 * separado parezca correcto.
 *
 * **El PNG sale con fondo transparente.** La rúbrica se estampa encima del PDF, así que un fondo
 * blanco taparía el texto del documento. Por eso el canvas nunca se rellena: sólo se dibuja el
 * trazo.
 */

export interface SignaturePadHandle {
  /** Borra el trazo y deja el canvas vacío. */
  clear: () => void;
  /**
   * PNG del trazo recortado a sus límites, o `null` si no se dibujó nada.
   *
   * Se recorta para que la firma no arrastre el margen vacío del canvas: al estamparse en el PDF
   * ocupa el recuadro que le asignaron, y con márgenes se vería diminuta y descentrada.
   */
  toPngBlob: () => Promise<Blob | null>;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  /** Se notifica en cada cambio para que el contenedor habilite o deshabilite «Guardar». */
  onStrokeChange?: (hasStroke: boolean) => void;
  disabled?: boolean;
  /** Alto del área de dibujo en píxeles CSS. El ancho siempre ocupa el contenedor. */
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/** Margen que se deja alrededor del trazo al recortar, en píxeles del canvas. */
const TRIM_PADDING = 12;

const STROKE_WIDTH = 2.6;

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    {
      onStrokeChange,
      disabled = false,
      height = 220,
      className,
      ariaLabel = 'Área para dibujar tu firma',
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /**
     * Puntero que está dibujando, o `null` si no hay trazo en curso.
     *
     * Se guarda el id y no un booleano para poder IGNORAR a los demás. En un celular es normal que
     * un segundo dedo o el canto de la mano toquen la pantalla a media firma; sin este filtro sus
     * eventos entran al mismo trazo y dibujan una raya desde donde iba la firma hasta donde
     * aterrizó el otro contacto.
     */
    const activePointerId = useRef<number | null>(null);
    /** Última muestra cruda del puntero: es el punto de CONTROL de la curva. */
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    /** Punto medio del tramo anterior: es donde ARRANCA el tramo siguiente. */
    const lastMidPoint = useRef<{ x: number; y: number } | null>(null);
    /**
     * Se lleva aparte del canvas porque leer los píxeles para saber si está vacío es caro y se
     * consultaría en cada render. Es la única fuente de verdad de «hay trazo».
     */
    const hasStroke = useRef(false);
    const [, forceRender] = useState(0);

    /**
     * Escala el canvas a la densidad real de la pantalla.
     *
     * Sin esto el trazo se ve borroso en pantallas con `devicePixelRatio > 1`, que son casi todos
     * los celulares — justo el dispositivo en el que más se va a usar.
     */
    const resize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ratio = window.devicePixelRatio || 1;
      const { width } = canvas.getBoundingClientRect();
      if (!width) return;

      const targetWidth = Math.round(width * ratio);
      const targetHeight = Math.round(height * ratio);

      /**
       * Si el búfer ya tiene el tamaño que corresponde no se toca nada.
       *
       * Rehacerlo implica borrar el trazo y repintarlo desde una imagen, que carga de forma
       * asíncrona: en el celular, donde la barra de direcciones aparece y desaparece al desplazar,
       * `resize` se dispara constantemente sin que el canvas cambie de tamaño, y cada vez el trazo
       * parpadeaba. A media firma, además, el repintado podía llegar tarde y pisar lo que se
       * acababa de dibujar.
       */
      if (canvas.width === targetWidth && canvas.height === targetHeight) {
        return;
      }

      /**
       * Redimensionar un canvas borra su contenido, así que el trazo se preserva y se vuelve a
       * pintar: si no, girar el teléfono a media firma la perdería.
       */
      const previous =
        hasStroke.current && canvas.width > 0
          ? canvas.toDataURL('image/png')
          : null;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.scale(ratio, ratio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = STROKE_WIDTH;
      context.strokeStyle = '#111827';

      if (previous) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, width, height);
        image.src = previous;
      }
    }, [height]);

    useEffect(() => {
      resize();

      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', resize);
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('orientationchange', resize);
      };
    }, [resize]);

    function pointFrom(
      source: { clientX: number; clientY: number },
      rect: DOMRect,
    ) {
      return {
        x: source.clientX - rect.left,
        y: source.clientY - rect.top,
      };
    }

    /** Punto medio entre dos muestras. */
    function midPointOf(
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function context2d() {
      return canvasRef.current?.getContext('2d') ?? null;
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
      if (disabled) return;

      // Ya hay un trazo en curso: este es un segundo contacto (otro dedo, el canto de la mano) y
      // se ignora por completo. Ver `activePointerId`.
      if (activePointerId.current !== null) return;

      // Captura el puntero para que el trazo siga aunque el dedo salga del canvas y vuelva; sin
      // esto, soltar fuera deja el trazo "pegado" y la siguiente pulsación dibuja una línea recta.
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerId.current = event.pointerId;

      const point = pointFrom(
        event,
        event.currentTarget.getBoundingClientRect(),
      );
      lastPoint.current = point;
      // El trazo arranca en la propia muestra: todavía no hay punto medio anterior.
      lastMidPoint.current = point;

      // Un toque sin arrastre también deja marca: es como se ponen los puntos de una firma.
      const context = context2d();
      if (context) {
        context.beginPath();
        context.arc(point.x, point.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
        context.fillStyle = context.strokeStyle;
        context.fill();
      }

      markStroke(true);
    }

    /**
     * Dibuja un tramo hasta `point` y avanza el estado del trazo.
     *
     * Va del punto medio ANTERIOR al punto medio con la muestra nueva, tomando la muestra anterior
     * como punto de control. Como cada tramo termina donde empieza el siguiente, el trazo queda
     * continuo (ver el docblock del componente).
     */
    function drawSegmentTo(
      context: CanvasRenderingContext2D,
      point: { x: number; y: number },
    ) {
      const previous = lastPoint.current;
      const previousMid = lastMidPoint.current;
      if (!previous || !previousMid) return;

      const midPoint = midPointOf(previous, point);

      context.beginPath();
      context.moveTo(previousMid.x, previousMid.y);
      context.quadraticCurveTo(previous.x, previous.y, midPoint.x, midPoint.y);
      context.stroke();

      lastPoint.current = point;
      lastMidPoint.current = midPoint;
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
      if (disabled || activePointerId.current !== event.pointerId) return;

      const context = context2d();
      if (!context || !lastPoint.current) return;

      const rect = event.currentTarget.getBoundingClientRect();

      /**
       * Muestras fusionadas: al dibujar rápido el navegador agrupa varios movimientos en un solo
       * evento —uno por cuadro— y entrega el resto sólo si se piden. Sin esto el trazo veloz se
       * reconstruye con muy pocas muestras y sale anguloso; con esto conserva todas las que el
       * dispositivo capturó.
       *
       * Es opcional a propósito: `getCoalescedEvents` no existe en todos los navegadores, y
       * también puede devolver una lista vacía. En cualquiera de los dos casos se usa el evento
       * mismo, que es exactamente el comportamiento anterior.
       */
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
      const samples = coalesced.length > 0 ? coalesced : [event.nativeEvent];

      for (const sample of samples) {
        drawSegmentTo(context, pointFrom(sample, rect));
      }
    }

    function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
      if (activePointerId.current !== event.pointerId) return;

      /**
       * Cierre del trazo hasta la última muestra.
       *
       * Cada tramo llega sólo hasta el punto medio, así que al soltar queda pendiente el pedazo
       * entre ese punto medio y el punto donde el usuario levantó el dedo. Sin este cierre la
       * firma termina un poco antes de donde se soltó, y en un trazo corto —una rúbrica de dos
       * gestos— eso se nota.
       */
      const context = context2d();
      const previous = lastPoint.current;
      const previousMid = lastMidPoint.current;
      if (context && previous && previousMid) {
        context.beginPath();
        context.moveTo(previousMid.x, previousMid.y);
        context.lineTo(previous.x, previous.y);
        context.stroke();
      }

      activePointerId.current = null;
      lastPoint.current = null;
      lastMidPoint.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    function markStroke(value: boolean) {
      if (hasStroke.current === value) return;
      hasStroke.current = value;
      onStrokeChange?.(value);
      forceRender((n) => n + 1);
    }

    function clear() {
      const canvas = canvasRef.current;
      const context = context2d();
      if (!canvas || !context) return;

      // En coordenadas del canvas, no las escaladas: `clearRect` opera sobre el búfer real.
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();

      markStroke(false);
    }

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => !hasStroke.current,
      toPngBlob: () => exportTrimmedPng(canvasRef.current, hasStroke.current),
    }));

    return (
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className={className}
        style={{
          width: '100%',
          height,
          // Imprescindible en táctil: sin esto el dedo desplaza la página en vez de dibujar.
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        /*
         * `pointercancel` cierra el trazo cuando el sistema se queda con el gesto (una llamada
         * entrante, el gesto de volver del navegador). No hay `pointerleave`: con el puntero
         * capturado, `pointerup` llega igual aunque el dedo esté fuera del canvas, y cerrar en
         * `pointerleave` cortaba el trazo en cuanto se rozaba el borde —justo lo que la captura
         * está puesta para evitar—. Al firmar rápido el trazo sale del área un instante y volvía
         * partido en dos.
         */
        onPointerCancel={handlePointerUp}
      />
    );
  },
);

/**
 * Exporta el trazo recortado a sus límites reales.
 *
 * Se recorren los píxeles buscando los que tienen alfa distinto de cero: como el canvas nunca se
 * rellena, todo lo opaco es trazo. El recorte se hace sobre un canvas nuevo para no destruir el
 * dibujo del usuario, que puede seguir editándolo después de guardar.
 */
async function exportTrimmedPng(
  canvas: HTMLCanvasElement | null,
  hasStroke: boolean,
): Promise<Blob | null> {
  if (!canvas || !hasStroke) return null;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // +3 es el canal alfa del píxel (RGBA).
      if (data[(y * width + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nada opaco: el usuario cree que dibujó pero el canvas está vacío.
  if (maxX < 0) return null;

  minX = Math.max(0, minX - TRIM_PADDING);
  minY = Math.max(0, minY - TRIM_PADDING);
  maxX = Math.min(width - 1, maxX + TRIM_PADDING);
  maxY = Math.min(height - 1, maxY + TRIM_PADDING);

  const trimmed = document.createElement('canvas');
  trimmed.width = maxX - minX + 1;
  trimmed.height = maxY - minY + 1;

  const trimmedContext = trimmed.getContext('2d');
  if (!trimmedContext) return null;

  trimmedContext.drawImage(
    canvas,
    minX,
    minY,
    trimmed.width,
    trimmed.height,
    0,
    0,
    trimmed.width,
    trimmed.height,
  );

  // Sin fondo: `toBlob` de un canvas no rellenado conserva la transparencia en PNG.
  return new Promise((resolve) =>
    trimmed.toBlob((blob) => resolve(blob), 'image/png'),
  );
}

export default SignaturePad;
