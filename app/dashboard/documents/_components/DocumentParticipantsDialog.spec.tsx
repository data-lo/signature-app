import { renderWithProviders, screen, within } from '@/test-utils';
import DocumentParticipantsDialog from './DocumentParticipantsDialog';
import { useDocumentDetail } from '../[documentId]/_hooks/useDocumentDetail';
import { ParticipantRole, ParticipantStatus } from '@/lib/enums/document';
import type { DocumentParticipant } from '../[documentId]/_requests';

jest.mock('../[documentId]/_hooks/useDocumentDetail');

const mockedUseDocumentDetail = useDocumentDetail as jest.Mock;

function buildParticipant(
  overrides: Partial<DocumentParticipant> = {},
): DocumentParticipant {
  return {
    id: 'part-1',
    userId: null,
    email: 'juan.perez@empresa.com',
    name: 'Juan Pérez',
    role: ParticipantRole.Signer,
    status: ParticipantStatus.Pending,
    cancellationReason: null,
    ...overrides,
  };
}

/** Deja el hook devolviendo un detalle con estos participantes y abre el diálogo. */
function renderWithParticipants(participants: DocumentParticipant[]) {
  mockedUseDocumentDetail.mockReturnValue({
    data: { participants },
    isLoading: false,
    isError: false,
  });

  return renderWithProviders(
    <DocumentParticipantsDialog
      documentId="doc-1"
      fileName="contrato.pdf"
      onOpenChange={jest.fn()}
    />,
  );
}

/** Los participantes de una sección, por el encabezado que la rotula. */
function sectionItems(title: string): string[] {
  const section = screen
    .getByRole('heading', { name: title })
    .closest('section');
  expect(section).not.toBeNull();

  return within(section as HTMLElement)
    .getAllByRole('listitem')
    .map((item) => item.textContent?.trim() ?? '');
}

describe('DocumentParticipantsDialog', () => {
  beforeEach(() => {
    mockedUseDocumentDetail.mockReset();
  });

  it('permanece cerrado y no consulta el detalle mientras no hay documento', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    renderWithProviders(
      <DocumentParticipantsDialog documentId={null} onOpenChange={jest.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedUseDocumentDetail).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
  });

  describe('firmantes', () => {
    it('muestra la sección con el nombre completo y el correo de cada firmante', () => {
      renderWithParticipants([
        buildParticipant({
          id: 'p-1',
          name: 'Juan Pérez',
          email: 'juan.perez@empresa.com',
        }),
        buildParticipant({
          id: 'p-2',
          name: 'Ana Gómez',
          email: 'ana.gomez@empresa.com',
        }),
      ]);

      expect(sectionItems('Firmantes')).toEqual([
        'Juan Pérezjuan.perez@empresa.com',
        'Ana Gómezana.gomez@empresa.com',
      ]);
    });

    /** Criterio "el modal muestra siempre la sección Firmantes". */
    it('muestra la sección aunque el documento no traiga firmantes', () => {
      renderWithParticipants([
        buildParticipant({ role: ParticipantRole.Watcher }),
      ]);

      expect(
        screen.getByRole('heading', { name: 'Firmantes' }),
      ).toBeInTheDocument();
    });
  });

  describe('observadores', () => {
    it('muestra la sección con nombre y correo cuando el documento tiene observadores', () => {
      renderWithParticipants([
        buildParticipant({ id: 'p-1' }),
        buildParticipant({
          id: 'p-2',
          name: 'Luis Ramos',
          email: 'luis.ramos@empresa.com',
          role: ParticipantRole.Watcher,
        }),
      ]);

      expect(sectionItems('Observadores')).toEqual([
        'Luis Ramosluis.ramos@empresa.com',
      ]);
    });

    it('separa a cada quien en su sección', () => {
      renderWithParticipants([
        buildParticipant({ id: 'p-1', name: 'Juan Pérez' }),
        buildParticipant({
          id: 'p-2',
          name: 'Luis Ramos',
          role: ParticipantRole.Watcher,
        }),
      ]);

      expect(sectionItems('Firmantes')).toHaveLength(1);
      expect(sectionItems('Firmantes')[0]).toContain('Juan Pérez');
      expect(sectionItems('Observadores')[0]).toContain('Luis Ramos');
    });

    /**
     * Criterio explícito de la historia: sin observadores no se muestra la sección NI un texto
     * que anuncie que está vacía.
     */
    it('no muestra la sección ni un estado vacío cuando no hay observadores', () => {
      renderWithParticipants([buildParticipant()]);

      expect(
        screen.queryByRole('heading', { name: 'Observadores' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/no hay observadores/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/sin observadores/i)).not.toBeInTheDocument();
    });
  });

  it('avisa si el detalle del documento no se pudo cargar', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderWithProviders(
      <DocumentParticipantsDialog
        documentId="doc-1"
        onOpenChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/no se pudieron cargar los participantes/i),
    ).toBeInTheDocument();
  });

  it('mientras carga no muestra secciones a medias', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(
      <DocumentParticipantsDialog
        documentId="doc-1"
        onOpenChange={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('status', { name: /cargando participantes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Firmantes' }),
    ).not.toBeInTheDocument();
  });
});
