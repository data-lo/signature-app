/**
 * Columnas configurables de la tabla de documentos (historia "Personalizador de columnas en la
 * tabla de Documentos").
 *
 * Cada usuario decide qué columnas ver. La preferencia es sólo de frontend: vive en
 * `localStorage`, por usuario, y nunca cambia lo que se pide al backend. Ocultar una columna no
 * la reordena: las visibles siempre se pintan en el orden de `DOCUMENT_COLUMNS`, así que al
 * volver a marcarla regresa a su lugar.
 *
 * La columna de acciones (menú de tres puntos) no está aquí a propósito: no es configurable y se
 * pinta siempre.
 */

/** Identificador estable de cada columna configurable; es lo que se guarda en `localStorage`. */
export type DocumentColumnId =
  | 'index'
  | 'document'
  | 'creator'
  | 'participation'
  | 'status'
  | 'createdAt'
  | 'signedAt'
  | 'signatureType';

export interface DocumentColumnDefinition {
  id: DocumentColumnId;
  /** Nombre de la columna en el menú "Personalizar columnas". */
  label: string;
  /**
   * La columna no se puede ocultar. Es la información principal de la fila: sin ella la tabla
   * quedaría sin contexto (fechas y estatus sin saber de qué documento son).
   */
  alwaysVisible?: boolean;
}

/** Columnas de la tabla, en el orden en que se pintan. */
export const DOCUMENT_COLUMNS: readonly DocumentColumnDefinition[] = [
  // El encabezado de la tabla dice "#"; en el menú se nombra para que se entienda qué es.
  { id: 'index', label: 'Índice' },
  { id: 'document', label: 'Documento', alwaysVisible: true },
  { id: 'creator', label: 'Creado por' },
  { id: 'participation', label: 'Participación' },
  { id: 'status', label: 'Estatus' },
  { id: 'createdAt', label: 'Fecha de creación' },
  { id: 'signedAt', label: 'Fecha de firma' },
  { id: 'signatureType', label: 'Tipo de firma' },
];

/** Configuración con la que abre la tabla si el usuario no guardó otra: todas visibles. */
export const DEFAULT_VISIBLE_DOCUMENT_COLUMNS: readonly DocumentColumnId[] =
  DOCUMENT_COLUMNS.map((column) => column.id);

const DOCUMENT_COLUMN_IDS = new Set<string>(DEFAULT_VISIBLE_DOCUMENT_COLUMNS);

/** Prefijo de la clave de `localStorage`; la clave completa lleva el id del usuario. */
const DOCUMENT_COLUMNS_STORAGE_PREFIX = 'documents-table-columns';

/**
 * Clave de `localStorage` con la preferencia de columnas de un usuario.
 *
 * Va por usuario y no por navegador: en un equipo compartido cada persona conserva su propia
 * configuración.
 *
 * @param userId - Id del usuario en sesión.
 * @returns La clave bajo la que se guarda su preferencia.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * documentColumnsStorageKey('user-1'); // 'documents-table-columns:user-1'
 * ```
 */
export function documentColumnsStorageKey(userId: string): string {
  return `${DOCUMENT_COLUMNS_STORAGE_PREFIX}:${userId}`;
}

/**
 * Normaliza una lista de columnas visibles: descarta ids desconocidos y repetidos, agrega las
 * que no se pueden ocultar y la devuelve en el orden de la tabla.
 *
 * @param columnIds - Columnas que se quieren visibles, en cualquier orden.
 * @returns Las columnas visibles en el orden de `DOCUMENT_COLUMNS`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeVisibleDocumentColumns(['status', 'index', 'inventada']);
 * // ['index', 'document', 'status']
 * ```
 */
export function normalizeVisibleDocumentColumns(
  columnIds: readonly string[],
): DocumentColumnId[] {
  const requested = new Set(columnIds);
  return DOCUMENT_COLUMNS.filter(
    (column) => column.alwaysVisible || requested.has(column.id),
  ).map((column) => column.id);
}

/**
 * Muestra u oculta una columna y devuelve la configuración resultante.
 *
 * Las columnas que no se pueden ocultar quedan visibles aunque se pida lo contrario, y el
 * resultado conserva el orden de la tabla: una columna que se vuelve a mostrar recupera su
 * posición original.
 *
 * @param visibleColumns - Columnas visibles antes del cambio.
 * @param columnId - Columna que se marca o desmarca.
 * @param visible - `true` para mostrarla, `false` para ocultarla.
 * @returns Las columnas visibles después del cambio.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * setDocumentColumnVisibility(['index', 'document', 'status'], 'status', false);
 * // ['index', 'document']
 * setDocumentColumnVisibility(['document'], 'document', false); // ['document']
 * ```
 */
export function setDocumentColumnVisibility(
  visibleColumns: readonly DocumentColumnId[],
  columnId: DocumentColumnId,
  visible: boolean,
): DocumentColumnId[] {
  const next = visible
    ? [...visibleColumns, columnId]
    : visibleColumns.filter((id) => id !== columnId);
  return normalizeVisibleDocumentColumns(next);
}

/**
 * Lee la preferencia guardada en `localStorage`.
 *
 * Tolera lo que pueda haber quedado ahí: una versión anterior con columnas que ya no existen, un
 * valor editado a mano o JSON roto. Lo ilegible cuenta como "sin preferencia" y la tabla abre con
 * la configuración predeterminada.
 *
 * @param raw - Valor crudo de `localStorage`; `null` si no hay nada guardado.
 * @returns Las columnas visibles guardadas, o `null` si no hay una preferencia válida.
 *
 * @throws Nada: un valor inválido devuelve `null`.
 *
 * @example
 * ```ts
 * parseStoredDocumentColumns('["status","index"]'); // ['index', 'document', 'status']
 * parseStoredDocumentColumns('{roto'); // null
 * parseStoredDocumentColumns(null); // null
 * ```
 */
export function parseStoredDocumentColumns(
  raw: string | null,
): DocumentColumnId[] | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((id): id is string => typeof id === 'string')
  ) {
    return null;
  }
  return normalizeVisibleDocumentColumns(
    parsed.filter((id) => DOCUMENT_COLUMN_IDS.has(id)),
  );
}

/**
 * Indica si una configuración es la predeterminada (todas las columnas visibles).
 *
 * @param visibleColumns - Columnas visibles.
 * @returns `true` si coincide con `DEFAULT_VISIBLE_DOCUMENT_COLUMNS`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isDefaultDocumentColumns(DEFAULT_VISIBLE_DOCUMENT_COLUMNS); // true
 * isDefaultDocumentColumns(['document']); // false
 * ```
 */
export function isDefaultDocumentColumns(
  visibleColumns: readonly DocumentColumnId[],
): boolean {
  const normalized = normalizeVisibleDocumentColumns(visibleColumns);
  return (
    normalized.length === DEFAULT_VISIBLE_DOCUMENT_COLUMNS.length &&
    normalized.every(
      (id, index) => id === DEFAULT_VISIBLE_DOCUMENT_COLUMNS[index],
    )
  );
}
