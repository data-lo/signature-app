/**
 * Reglas de paginación del listado de documentos.
 *
 * El backend (`GET /api/v1/document`) numera las páginas desde 1, acepta `limit` entre 1 y 100 y
 * responde `pagination.totalPages = ceil(total / limit)`, que vale **0** cuando no hay
 * documentos. Todo lo de aquí traduce ese contrato a lo que la tabla necesita: una página que
 * siempre exista.
 */

/** Tamaños de página que ofrece el selector "Documentos por página". */
export const DOCUMENTS_PAGE_SIZES = [10, 25, 50] as const;

export type DocumentsPageSize = (typeof DOCUMENTS_PAGE_SIZES)[number];

/** Tamaño con el que abre la pantalla; coincide con el `limit` por omisión del backend. */
export const DEFAULT_DOCUMENTS_PAGE_SIZE: DocumentsPageSize = 25;

/**
 * Última página navegable.
 *
 * Con cero documentos el backend dice `totalPages: 0`, pero la tabla sigue estando en la página
 * 1 (vacía): no existe una "página 0" a la que ir.
 *
 * @param totalPages - `pagination.totalPages` del backend.
 * @returns La última página, nunca menor que 1.
 *
 * @example
 * ```ts
 * lastDocumentsPage(0); // 1
 * lastDocumentsPage(4); // 4
 * ```
 */
export function lastDocumentsPage(totalPages: number): number {
  return Math.max(1, Math.floor(totalPages));
}

/**
 * Lleva una página al rango válido `[1, última]`.
 *
 * @param page - Página pedida (puede venir de un botón, de un refetch o de un número inválido).
 * @param totalPages - `pagination.totalPages` del backend.
 * @returns La página más cercana que existe.
 *
 * @example
 * ```ts
 * clampDocumentsPage(5, 3); // 3
 * clampDocumentsPage(0, 3); // 1
 * clampDocumentsPage(2, 0); // 1
 * ```
 */
export function clampDocumentsPage(page: number, totalPages: number): number {
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(safePage, 1), lastDocumentsPage(totalPages));
}

/**
 * Dice si un valor es uno de los tamaños de página ofrecidos.
 *
 * @param value - Lo que devolvió el selector.
 * @returns `true` si es 10, 25 o 50.
 *
 * @example
 * ```ts
 * isDocumentsPageSize(50); // true
 * isDocumentsPageSize(7); // false
 * ```
 */
export function isDocumentsPageSize(value: number): value is DocumentsPageSize {
  return (DOCUMENTS_PAGE_SIZES as readonly number[]).includes(value);
}
