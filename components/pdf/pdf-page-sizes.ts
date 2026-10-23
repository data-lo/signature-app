import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageSizePt } from '@/lib/signature-geometry';

/**
 * Lee el tamaño en puntos de cada página del PDF, tal como se ve (con su rotación aplicada).
 *
 * Es lo que permite dibujar sólo las páginas cercanas a la vista (ver `LazyPdfPage`): con el
 * tamaño de todas las hojas por adelantado, las que no se dibujan ocupan exactamente su alto y
 * el scroll no salta cuando una entra o sale del render. `getPage` sólo lee el diccionario de la
 * página en el worker de PDF.js —no decodifica imágenes ni rasteriza—, así que es barato incluso
 * con documentos escaneados de cientos de hojas, y pdf.js cachea la página para cuando se dibuje.
 *
 * `getViewport({ scale: 1 })` es el mismo viewport del que react-pdf saca `originalWidth`/
 * `originalHeight`, así que el tamaño coincide con el que antes publicaba cada `<Page>` al cargar.
 *
 * @param pdf - Documento ya parseado, tal como lo entrega `onLoadSuccess` de react-pdf.
 * @returns Un tamaño por página, en orden (el índice 0 es la página 1); vacío si no hay páginas.
 *
 * @throws {Error} Si pdf.js no puede leer alguna página (documento dañado o worker caído).
 *
 * @example
 * ```ts
 * const sizes = await loadPdfPageSizes(pdf);
 * sizes[0]; // { width: 612, height: 792 } para una hoja carta vertical
 * ```
 */
export async function loadPdfPageSizes(
  pdf: Pick<PDFDocumentProxy, 'numPages' | 'getPage'>,
): Promise<PageSizePt[]> {
  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  return Promise.all(
    pageNumbers.map(async (pageNumber) => {
      const page = await pdf.getPage(pageNumber);
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    }),
  );
}
