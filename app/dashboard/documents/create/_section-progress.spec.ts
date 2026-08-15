import {
  buildCreateDocumentProgress,
  PENDING_LABEL,
  type CreateDocumentProgressParams,
} from './_section-progress';

function params(
  overrides: Partial<CreateDocumentProgressParams> = {},
): CreateDocumentProgressParams {
  return {
    hasFile: false,
    isFileLoading: false,
    pageCount: null,
    signerCount: 0,
    viewerCount: 0,
    ...overrides,
  };
}

/** Solicitud con todo lo que el envío exige: documento, tipo de firma y un firmante. */
function completeParams(
  overrides: Partial<CreateDocumentProgressParams> = {},
): CreateDocumentProgressParams {
  return params({
    hasFile: true,
    fileName: 'contrato.pdf',
    pageCount: 3,
    signatureType: 'SIMPLE',
    signerCount: 1,
    ...overrides,
  });
}

describe('buildCreateDocumentProgress', () => {
  describe('cargar documento', () => {
    it('sin archivo no está completa y su encabezado contraído queda pendiente', () => {
      const progress = buildCreateDocumentProgress(params());

      expect(progress.upload.isComplete).toBe(false);
      expect(progress.upload.collapsedSummary).toBe(PENDING_LABEL);
    });

    it('un archivo a medio procesar todavía no cuenta como cargado', () => {
      const progress = buildCreateDocumentProgress(
        params({ hasFile: true, fileName: 'contrato.pdf', isFileLoading: true }),
      );

      expect(progress.upload.isComplete).toBe(false);
    });

    it('cargado, el encabezado contraído muestra nombre de archivo y páginas', () => {
      const progress = buildCreateDocumentProgress(
        params({ hasFile: true, fileName: 'contrato.pdf', pageCount: 3 }),
      );

      expect(progress.upload.isComplete).toBe(true);
      expect(progress.upload.collapsedSummary).toBe('contrato.pdf · 3 páginas');
    });

    it('mientras el visor no reporta las páginas, el encabezado muestra solo el nombre', () => {
      const progress = buildCreateDocumentProgress(
        params({ hasFile: true, fileName: 'contrato.pdf', pageCount: null }),
      );

      expect(progress.upload.collapsedSummary).toBe('contrato.pdf');
    });

    it('singulariza el conteo de una sola página', () => {
      const progress = buildCreateDocumentProgress(
        params({ hasFile: true, fileName: 'contrato.pdf', pageCount: 1 }),
      );

      expect(progress.upload.collapsedSummary).toBe('contrato.pdf · 1 página');
    });
  });

  describe('configurar firma', () => {
    it('sin tipo de firma no está completa', () => {
      const progress = buildCreateDocumentProgress(
        params({ signatureType: undefined }),
      );

      expect(progress.configuration.isComplete).toBe(false);
      expect(progress.configuration.collapsedSummary).toBe(PENDING_LABEL);
    });

    it('con tipo elegido, el encabezado contraído muestra su etiqueta legible', () => {
      const progress = buildCreateDocumentProgress(
        params({ signatureType: 'ADVANCED' }),
      );

      expect(progress.configuration.isComplete).toBe(true);
      expect(progress.configuration.collapsedSummary).toBe(
        'Firma electrónica avanzada (e.firma)',
      );
    });
  });

  describe('añadir participantes', () => {
    it('sin firmantes no está completa', () => {
      const progress = buildCreateDocumentProgress(
        params({ signerCount: 0, viewerCount: 2 }),
      );

      expect(progress.participants.isComplete).toBe(false);
    });

    it('el encabezado contraído siempre muestra cuántos firmantes y espectadores hay', () => {
      const progress = buildCreateDocumentProgress(
        params({ signerCount: 1, viewerCount: 2 }),
      );

      expect(progress.participants.isComplete).toBe(true);
      expect(progress.participants.collapsedSummary).toBe(
        '1 firmante · 2 espectadores',
      );
    });
  });

  describe('resumen fijo', () => {
    it('muestra "Pendiente" en cada dato que todavía no existe', () => {
      const progress = buildCreateDocumentProgress(params());

      expect(progress.summary).toEqual({
        documentName: PENDING_LABEL,
        pageCount: PENDING_LABEL,
        signatureType: PENDING_LABEL,
        signerCount: PENDING_LABEL,
        // Cero espectadores es un dato conocido, no información faltante.
        viewerCount: '0 espectadores',
      });
    });

    it('refleja el documento, la configuración y los participantes ya elegidos', () => {
      const progress = buildCreateDocumentProgress(
        completeParams({ signatureType: 'ADVANCED', signerCount: 2, viewerCount: 1 }),
      );

      expect(progress.summary).toEqual({
        documentName: 'contrato.pdf',
        pageCount: '3 páginas',
        signatureType: 'Firma electrónica avanzada (e.firma)',
        signerCount: '2 firmantes',
        viewerCount: '1 espectador',
      });
    });
  });

  describe('habilitación del envío', () => {
    it('exige las tres secciones completas', () => {
      expect(
        buildCreateDocumentProgress(completeParams()).isReadyToSubmit,
      ).toBe(true);
    });

    it.each([
      ['sin documento', { hasFile: false }],
      ['con el documento a medio procesar', { isFileLoading: true }],
      ['sin tipo de firma', { signatureType: undefined }],
      ['sin firmantes', { signerCount: 0 }],
    ])('no se habilita %s', (_caso, overrides) => {
      expect(
        buildCreateDocumentProgress(completeParams(overrides)).isReadyToSubmit,
      ).toBe(false);
    });
  });
});
