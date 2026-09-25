'use client';

import { useRef, type RefObject } from 'react';
import { Page } from 'react-pdf';
import type { PageSizePt } from '@/lib/signature-geometry';
import { useNearViewport } from './use-near-viewport';

interface LazyPdfPageProps {
  pageNumber: number;
  /** Ancho de render en píxeles; el alto sale de la proporción de la hoja. */
  width: number;
  /** Tamaño en puntos de la hoja (ver `loadPdfPageSizes`). */
  size: PageSizePt;
  /** Contenedor con scroll del visor, raíz del cálculo de cercanía. */
  scrollRootRef: RefObject<HTMLElement | null>;
}

/**
 * Alto de render de una hoja a un ancho dado, conservando su proporción.
 *
 * @param size - Tamaño en puntos de la hoja.
 * @param width - Ancho de render en píxeles.
 * @returns El alto en píxeles, redondeado.
 *
 * @example
 * ```ts
 * renderedPageHeight({ width: 612, height: 792 }, 520); // 673
 * ```
 */
export function renderedPageHeight(size: PageSizePt, width: number): number {
  return Math.round((width * size.height) / size.width);
}

/**
 * Una página del PDF que sólo se dibuja mientras está cerca del área visible del visor.
 *
 * Antes cada visor montaba un `<Page>` por hoja al mismo tiempo, cada uno con su canvas, su capa
 * de texto y su capa de anotaciones. Con un PDF escaneado de 12–20 MB y decenas de páginas eso
 * rasterizaba todo el documento de golpe: la pestaña se congelaba varios segundos y la memoria
 * crecía con cada canvas. Ahora las hojas lejanas son un recuadro vacío del mismo tamaño —el
 * scroll y la posición de cada página no cambian— y se dibujan al acercarse; al alejarse se
 * desmontan y liberan su canvas.
 *
 * Debe ir dentro de un `<Document>` de react-pdf.
 *
 * @param props.pageNumber - Número de página (desde 1).
 * @param props.width - Ancho de render en píxeles.
 * @param props.size - Tamaño en puntos de la hoja, para reservar su alto sin dibujarla.
 * @param props.scrollRootRef - Contenedor con scroll del visor.
 * @returns El contenedor de la página, con el `<Page>` o con el recuadro de reserva.
 *
 * @example
 * ```tsx
 * <LazyPdfPage pageNumber={1} width={520} size={pageSizes[0]} scrollRootRef={containerRef} />
 * ```
 */
export default function LazyPdfPage({
  pageNumber,
  width,
  size,
  scrollRootRef,
}: LazyPdfPageProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const isNear = useNearViewport(pageRef, scrollRootRef);
  const height = renderedPageHeight(size, width);

  return (
    <div
      ref={pageRef}
      data-page-number={pageNumber}
      className="relative bg-white"
      // `minHeight` y no `height`: react-pdf redondea el canvas por su cuenta, y un píxel de
      // diferencia no debe recortar la capa de texto.
      style={{ width, minHeight: height }}
    >
      {isNear ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer
          renderAnnotationLayer
          loading={<PagePlaceholder pageNumber={pageNumber} />}
          error={
            <p className="flex h-full min-h-40 items-center justify-center px-4 text-center text-sm text-destructive">
              No se pudo mostrar la página {pageNumber}.
            </p>
          }
        />
      ) : (
        <PagePlaceholder pageNumber={pageNumber} />
      )}
    </div>
  );
}

/** Recuadro que ocupa el lugar de una página mientras no está dibujada. */
function PagePlaceholder({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
      Página {pageNumber}
    </div>
  );
}
