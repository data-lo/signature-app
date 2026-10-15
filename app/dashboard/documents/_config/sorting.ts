/**
 * Ordenamiento local del listado de documentos por nombre (columna "Documento").
 *
 * Es sólo de frontend: reordena los documentos que la tabla ya tiene cargados —la página
 * actual— y nunca pide otro orden al backend ni cambia el que éste devuelve. Arranca
 * desactivado (`'none'`): la tabla muestra el orden del backend hasta que se pulsa el botón.
 */

/** Estado del ordenamiento por nombre. `'none'` es el orden tal como llega del backend. */
export type DocumentNameSort = 'none' | 'asc' | 'desc';

/** Estado con el que abre la tabla: sin ordenamiento local. */
export const DEFAULT_DOCUMENT_NAME_SORT: DocumentNameSort = 'none';

/**
 * Comparador de nombres en español: no distingue mayúsculas ni acentos ("árbol" va junto a
 * "arbol") y compara los números por su valor ("contrato 2" antes que "contrato 10").
 */
const documentNameCollator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true,
});

/**
 * Siguiente estado al pulsar el botón de ordenar.
 *
 * La primera activación ordena ascendente y las siguientes alternan entre descendente y
 * ascendente; una vez activado no vuelve a `'none'`.
 *
 * @param current - Estado actual del ordenamiento.
 * @returns El estado que corresponde tras la activación.
 *
 * @throws Nada: es una tabla de transiciones.
 *
 * @example
 * ```ts
 * nextDocumentNameSort('none'); // 'asc'
 * nextDocumentNameSort('asc'); // 'desc'
 * nextDocumentNameSort('desc'); // 'asc'
 * ```
 */
export function nextDocumentNameSort(
  current: DocumentNameSort,
): DocumentNameSort {
  return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Ordena por nombre los documentos dados, sin tocar el arreglo original.
 *
 * Sólo reordena lo que recibe —los documentos visibles—; con `'none'` devuelve el mismo arreglo
 * para conservar el orden del backend. Los nombres iguales mantienen entre sí el orden en que
 * llegaron (el ordenamiento de `Array.prototype.sort` es estable).
 *
 * @param documents - Documentos mostrados en la tabla.
 * @param direction - Estado del ordenamiento.
 * @returns Los documentos en el orden pedido; con `'none'`, el mismo arreglo recibido.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * sortDocumentsByName([{ fileName: 'b.pdf' }, { fileName: 'A.pdf' }], 'asc');
 * // [{ fileName: 'A.pdf' }, { fileName: 'b.pdf' }]
 * ```
 */
export function sortDocumentsByName<T extends { fileName: string }>(
  documents: readonly T[],
  direction: DocumentNameSort,
): readonly T[] {
  if (direction === 'none') return documents;
  const factor = direction === 'asc' ? 1 : -1;
  return [...documents].sort(
    (a, b) => factor * documentNameCollator.compare(a.fileName, b.fileName),
  );
}
