import {
  buildCreateDocumentSections,
  MISSING_FILE_MESSAGE,
  type CreateDocumentSectionsParams,
} from './_section-rules';

function params(
  overrides: Partial<CreateDocumentSectionsParams> = {},
): CreateDocumentSectionsParams {
  return {
    hasFile: false,
    isFileLoading: false,
    isReadyToSubmit: false,
    isSubmitting: false,
    showCreatedDocuments: true,
    isLoadingCreatedDocuments: false,
    ...overrides,
  };
}

describe('buildCreateDocumentSections', () => {
  describe('carga del documento', () => {
    it('siempre está habilitada: es el punto de entrada del flujo', () => {
      expect(buildCreateDocumentSections(params()).upload.isEnabled).toBe(true);
      expect(
        buildCreateDocumentSections(params({ isSubmitting: true })).upload
          .isEnabled,
      ).toBe(true);
    });

    it('refleja el procesamiento local del archivo como estado de carga', () => {
      const sections = buildCreateDocumentSections(
        params({ isFileLoading: true }),
      );

      expect(sections.upload.isLoading).toBe(true);
    });
  });

  describe('configuración y participantes', () => {
    it('no dependen del archivo: se pueden llenar antes de cargarlo', () => {
      const sections = buildCreateDocumentSections(params({ hasFile: false }));

      expect(sections.configuration.isEnabled).toBe(true);
      expect(sections.participants.isEnabled).toBe(true);
    });

    it('participantes expone el error general que no pertenece a ningún campo', () => {
      const sections = buildCreateDocumentSections(
        params({ participantsErrorMessage: 'Agrega al menos un firmante' }),
      );

      expect(sections.participants.hasError).toBe(true);
      expect(sections.participants.errorMessage).toBe(
        'Agrega al menos un firmante',
      );
    });

    it('sin error, participantes no reporta ninguno', () => {
      const sections = buildCreateDocumentSections(params());

      expect(sections.participants.hasError).toBe(false);
      expect(sections.participants.errorMessage).toBeUndefined();
    });
  });

  describe('ubicación de firmas', () => {
    it('sin archivo, está deshabilitada y explica el requisito que falta', () => {
      const sections = buildCreateDocumentSections(params({ hasFile: false }));

      expect(sections.signaturePlacement.isEnabled).toBe(false);
      expect(sections.signaturePlacement.missingRequirementMessage).toBe(
        MISSING_FILE_MESSAGE,
      );
    });

    it('con un archivo todavía procesándose, sigue deshabilitada y en carga', () => {
      const sections = buildCreateDocumentSections(
        params({ hasFile: true, isFileLoading: true }),
      );

      expect(sections.signaturePlacement.isEnabled).toBe(false);
      expect(sections.signaturePlacement.isLoading).toBe(true);
    });

    it('con el archivo cargado, se habilita y deja de pedir requisitos', () => {
      const sections = buildCreateDocumentSections(params({ hasFile: true }));

      expect(sections.signaturePlacement.isEnabled).toBe(true);
      expect(
        sections.signaturePlacement.missingRequirementMessage,
      ).toBeUndefined();
    });
  });

  describe('documentos creados', () => {
    it('se deshabilita (no se muestra) cuando la pantalla no la pide, aunque la consulta falle', () => {
      const sections = buildCreateDocumentSections(
        params({
          showCreatedDocuments: false,
          isLoadingCreatedDocuments: true,
          createdDocumentsErrorMessage: 'Servicio no disponible',
        }),
      );

      expect(sections.createdDocuments.isEnabled).toBe(false);
      expect(sections.createdDocuments.isLoading).toBe(false);
      expect(sections.createdDocuments.hasError).toBe(false);
      expect(sections.createdDocuments.errorMessage).toBeUndefined();
    });

    it('cuando se muestra, hereda la carga y el error de la consulta del listado', () => {
      const sections = buildCreateDocumentSections(
        params({
          isLoadingCreatedDocuments: true,
          createdDocumentsErrorMessage: 'Servicio no disponible',
        }),
      );

      expect(sections.createdDocuments.isEnabled).toBe(true);
      expect(sections.createdDocuments.isLoading).toBe(true);
      expect(sections.createdDocuments.errorMessage).toBe(
        'Servicio no disponible',
      );
    });
  });

  describe('envío', () => {
    it('con alguna de las tres secciones incompleta no se puede enviar', () => {
      expect(
        buildCreateDocumentSections(params({ isReadyToSubmit: false }))
          .submission.isEnabled,
      ).toBe(false);
    });

    it('no depende del archivo por su cuenta: el requisito completo lo resuelve `isReadyToSubmit`', () => {
      expect(
        buildCreateDocumentSections(params({ hasFile: true })).submission
          .isEnabled,
      ).toBe(false);
    });

    it('con un envío en curso, se bloquea y se reporta como carga', () => {
      const sections = buildCreateDocumentSections(
        params({ isReadyToSubmit: true, isSubmitting: true }),
      );

      expect(sections.submission.isEnabled).toBe(false);
      expect(sections.submission.isLoading).toBe(true);
    });

    it('con las tres secciones completas y sin envío en curso, se habilita', () => {
      expect(
        buildCreateDocumentSections(params({ isReadyToSubmit: true })).submission
          .isEnabled,
      ).toBe(true);
    });

    it('expone el error del backend del último envío', () => {
      const sections = buildCreateDocumentSections(
        params({ isReadyToSubmit: true, submitErrorMessage: 'Nombre duplicado' }),
      );

      expect(sections.submission.hasError).toBe(true);
      expect(sections.submission.errorMessage).toBe('Nombre duplicado');
    });
  });
});
