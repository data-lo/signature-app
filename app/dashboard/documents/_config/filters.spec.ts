import { DocumentStatus, DocumentView } from '@/lib/enums/document';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  activeFilterChips,
  buildDocumentsQueryParams,
  type DocumentsFilters,
} from './filters';

function filters(overrides: Partial<DocumentsFilters> = {}): DocumentsFilters {
  return { ...DEFAULT_DOCUMENTS_FILTERS, ...overrides };
}

describe('filtros del listado unificado', () => {
  describe('parámetros de la consulta', () => {
    /**
     * `view` viaja siempre, incluso con su valor por omisión: el backend también tiene un valor
     * por defecto, y dejar que cada extremo elija el suyo es cómo terminan discrepando.
     */
    /**
     * `view=all` viaja explícito aunque sea el valor por omisión: si se omitiera, el backend
     * aplicaría SU propio valor por omisión (`requires_my_signature`) y la pantalla abriría
     * recortada sin que nada en ella lo dijera.
     */
    it('manda siempre el recorte, y nada más si no hay filtros', () => {
      expect(buildDocumentsQueryParams(filters())).toEqual({
        view: DocumentView.All,
      });
    });

    /**
     * Un parámetro vacío no significa lo mismo que uno ausente: `statuses=` llega como cadena
     * vacía y el DTO del backend lo rechaza, así que sólo viaja lo que está puesto.
     */
    it('omite los filtros vacíos en vez de mandarlos en blanco', () => {
      const params = buildDocumentsQueryParams(
        filters({ search: '', participant: '', createdFrom: '' }),
      );

      expect(params).not.toHaveProperty('search');
      expect(params).not.toHaveProperty('participant');
      expect(params).not.toHaveProperty('createdFrom');
    });

    it('manda varios estatus separados por comas', () => {
      const params = buildDocumentsQueryParams(
        filters({
          statuses: [DocumentStatus.PendingSignature, DocumentStatus.Signed],
        }),
      );

      expect(params.statuses).toBe('PENDING_SIGNATURE,SIGNED');
    });

    it('traduce cada filtro a su parámetro del endpoint', () => {
      const params = buildDocumentsQueryParams(
        filters({
          view: DocumentView.All,
          search: 'contrato',
          participant: 'isaay',
          createdFrom: '2026-01-01',
          createdTo: '2026-12-31',
          signedFrom: '2026-02-01',
          signedTo: '2026-11-30',
        }),
      );

      expect(params).toEqual({
        view: 'all',
        search: 'contrato',
        participant: 'isaay',
        createdFrom: '2026-01-01',
        createdTo: '2026-12-31',
        signedFrom: '2026-02-01',
        signedTo: '2026-11-30',
      });
    });
  });

  describe('chips de filtros activos', () => {
    it('no muestra chip alguno cuando no hay filtros puestos', () => {
      expect(activeFilterChips(filters())).toEqual([]);
    });

    /**
     * El recorte por omisión no produce chip: el encabezado de la lista ya dice cuál está
     * aplicado, y un chip cuyo botón de quitar devuelve al mismo valor sería un botón inerte.
     */
    it('no produce chip para el recorte por omisión', () => {
      expect(activeFilterChips(filters({ view: DocumentView.All }))).toEqual(
        [],
      );
    });

    /**
     * Con "Todos" como valor por omisión, "Requieren mi firma o revisión" pasa a ser un recorte
     * como cualquier otro: se anuncia con su chip, y quitarlo vuelve a "Todos".
     */
    it('el recorte "Requieren mi firma" produce chip, y quitarlo vuelve a Todos', () => {
      const [chip] = activeFilterChips(
        filters({ view: DocumentView.RequiresMySignature }),
      );

      expect(chip.label).toBe('Requieren mi firma o revisión');
      expect(
        chip.remove(filters({ view: DocumentView.RequiresMySignature })).view,
      ).toBe(DocumentView.All);
    });

    it('produce un chip por cada filtro puesto', () => {
      const chips = activeFilterChips(
        filters({
          view: DocumentView.Completed,
          statuses: [DocumentStatus.PendingSignature, DocumentStatus.Rejected],
          participant: 'isaay',
          createdFrom: '2026-01-01',
          createdTo: '2026-12-31',
        }),
      );

      expect(chips.map((chip) => chip.label)).toEqual([
        'Completados',
        'En espera de firma',
        'Rechazado',
        'Participante: isaay',
        'Creación 2026-01-01 → 2026-12-31',
      ]);
    });

    it('quitar el chip del recorte vuelve al valor por omisión, no a "sin recorte"', () => {
      const current = filters({ view: DocumentView.CreatedByMe });
      const [chip] = activeFilterChips(current);

      expect(chip.remove(current).view).toBe(DEFAULT_DOCUMENTS_FILTERS.view);
    });

    /** Cada estado se quita por separado; los demás siguen puestos. */
    it('quitar el chip de un estado conserva los otros', () => {
      const current = filters({
        statuses: [DocumentStatus.PendingSignature, DocumentStatus.Rejected],
      });
      const chip = activeFilterChips(current).find(
        (item) => item.id === 'status:PENDING_SIGNATURE',
      )!;

      expect(chip.remove(current).statuses).toEqual([DocumentStatus.Rejected]);
    });

    it('quitar el chip de un rango de fechas limpia sus dos extremos', () => {
      const current = filters({
        signedFrom: '2026-02-01',
        signedTo: '2026-11-30',
      });
      const [chip] = activeFilterChips(current);

      expect(chip.remove(current)).toEqual(
        expect.objectContaining({ signedFrom: '', signedTo: '' }),
      );
    });

    /** Un rango a medias también es un filtro: se dice cuál de los dos extremos está puesto. */
    it('describe un rango con un solo extremo', () => {
      const [chip] = activeFilterChips(filters({ createdFrom: '2026-01-01' }));

      expect(chip.label).toBe('Creación desde 2026-01-01');
    });
  });
});
