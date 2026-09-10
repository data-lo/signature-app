import { DocumentStatus, DocumentView } from '@/lib/enums/document';

/**
 * Estado de los filtros del listado unificado, y su traducción a los parámetros del endpoint.
 *
 * Vive aparte del panel que los edita porque ya no es cosa de un componente: lo leen la barra de
 * búsqueda, los chips, la consulta y la caché. Cuando el módulo estaba partido en tres pantallas,
 * cada una decidía sus parámetros al vuelo (`participantEmail` aquí, `email` allá) y por eso el
 * mismo documento se buscaba distinto según dónde estuvieras.
 */
export interface DocumentsFilters {
  /**
   * El recorte principal, lo que antes era la sección. Nunca está vacío: `All` es el valor de
   * "sin recorte", y por eso el filtro se quita volviendo a él y no borrándolo.
   */
  view: DocumentView;
  /** Búsqueda libre por nombre del documento o participante. Vive en la barra, no en el panel. */
  search: string;
  /** Vacío significa "cualquier estado"; el backend ignora la lista vacía. */
  statuses: DocumentStatus[];
  participant: string;
  createdFrom: string;
  createdTo: string;
  signedFrom: string;
  signedTo: string;
}

/**
 * Con qué filtros abre la pantalla: lo que espera una acción del usuario.
 *
 * Es la misma decisión que antes tomaba el sidebar al mandar a "Por firmar" — la bandeja abre por
 * lo que hay que hacer, no por todo lo que existe — sólo que ahora se puede cambiar sin salir de
 * la pantalla.
 */
export const DEFAULT_DOCUMENTS_FILTERS: DocumentsFilters = {
  view: DocumentView.RequiresMySignature,
  search: '',
  statuses: [],
  participant: '',
  createdFrom: '',
  createdTo: '',
  signedFrom: '',
  signedTo: '',
};

export const DOCUMENT_VIEW_LABELS: Record<DocumentView, string> = {
  [DocumentView.RequiresMySignature]: 'Requieren mi firma o revisión',
  [DocumentView.CreatedByMe]: 'Creados por mí',
  [DocumentView.Completed]: 'Completados',
  [DocumentView.All]: 'Todos',
};

/** Las opciones de "Participación", en el orden del diseño. `All` es el estado sin recorte. */
export const DOCUMENT_VIEW_OPTIONS: DocumentView[] = [
  DocumentView.RequiresMySignature,
  DocumentView.CreatedByMe,
  DocumentView.Completed,
  DocumentView.All,
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.Created]: 'Creado',
  [DocumentStatus.Pending]: 'En progreso',
  [DocumentStatus.Signed]: 'Firmado por todos',
  [DocumentStatus.Rejected]: 'Rechazado',
  [DocumentStatus.Expired]: 'Expirado',
  [DocumentStatus.CancellationPending]: 'Cancelación pendiente',
  [DocumentStatus.Cancelled]: 'Cancelado',
};

export const DOCUMENT_STATUS_OPTIONS: DocumentStatus[] = [
  DocumentStatus.Created,
  DocumentStatus.Pending,
  DocumentStatus.Signed,
  DocumentStatus.Rejected,
  DocumentStatus.Expired,
  DocumentStatus.CancellationPending,
  DocumentStatus.Cancelled,
];

/** Un filtro activo tal como se muestra —y se quita— en la fila de chips. */
export interface ActiveFilterChip {
  /** Identificador estable del chip; sirve de `key` y de destino del botón de quitar. */
  id: string;
  label: string;
  /** Los filtros que quedan al quitar este chip. */
  remove: (filters: DocumentsFilters) => DocumentsFilters;
}

function formatDateRange(from: string, to: string): string {
  if (from && to) return `${from} → ${to}`;
  return from ? `desde ${from}` : `hasta ${to}`;
}

/**
 * Los filtros activos, listos para pintarse como chips.
 *
 * La `view` sólo produce chip cuando NO es la de por omisión: el encabezado de la lista ya dice
 * cuál está aplicada, y un chip "Requieren mi firma o revisión" que reaparece en cuanto se quita
 * —porque quitarlo significa volver al valor por omisión— sería un botón que no hace nada.
 */
export function activeFilterChips(
  filters: DocumentsFilters,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.view !== DEFAULT_DOCUMENTS_FILTERS.view) {
    chips.push({
      id: `view:${filters.view}`,
      label: DOCUMENT_VIEW_LABELS[filters.view],
      remove: (current) => ({
        ...current,
        view: DEFAULT_DOCUMENTS_FILTERS.view,
      }),
    });
  }

  filters.statuses.forEach((status) => {
    chips.push({
      id: `status:${status}`,
      label: DOCUMENT_STATUS_LABELS[status],
      remove: (current) => ({
        ...current,
        statuses: current.statuses.filter((item) => item !== status),
      }),
    });
  });

  if (filters.participant) {
    chips.push({
      id: 'participant',
      label: `Participante: ${filters.participant}`,
      remove: (current) => ({ ...current, participant: '' }),
    });
  }

  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      id: 'created',
      label: `Creación ${formatDateRange(filters.createdFrom, filters.createdTo)}`,
      remove: (current) => ({ ...current, createdFrom: '', createdTo: '' }),
    });
  }

  if (filters.signedFrom || filters.signedTo) {
    chips.push({
      id: 'signed',
      label: `Firma ${formatDateRange(filters.signedFrom, filters.signedTo)}`,
      remove: (current) => ({ ...current, signedFrom: '', signedTo: '' }),
    });
  }

  return chips;
}

/**
 * Traduce los filtros a los parámetros del endpoint unificado.
 *
 * Sólo viaja lo que está puesto: un parámetro vacío no significa lo mismo que un parámetro
 * ausente para el DTO del backend, y mandar `statuses=` haría que la validación lo rechace.
 * `statuses` va separado por comas —no como arreglo— porque así lo espera el DTO y evita
 * depender de cómo serialice arreglos el cliente HTTP.
 */
export function buildDocumentsQueryParams(
  filters: DocumentsFilters,
): Record<string, string> {
  const params: Record<string, string> = { view: filters.view };

  if (filters.search) params.search = filters.search;
  if (filters.statuses.length) params.statuses = filters.statuses.join(',');
  if (filters.participant) params.participant = filters.participant;
  if (filters.createdFrom) params.createdFrom = filters.createdFrom;
  if (filters.createdTo) params.createdTo = filters.createdTo;
  if (filters.signedFrom) params.signedFrom = filters.signedFrom;
  if (filters.signedTo) params.signedTo = filters.signedTo;

  return params;
}
