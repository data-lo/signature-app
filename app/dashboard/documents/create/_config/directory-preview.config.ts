/**
 * Un contacto del Directorio tal como lo pinta el modal de selección: sólo nombre y apellido.
 *
 * Es la forma mínima que necesita la interfaz. Cuando el modal se conecte a
 * `GET /api/v1/directory/contacts`, la respuesta trae más campos (correo, RFC, teléfono) que el
 * modal puede ignorar o empezar a mostrar.
 */
export interface DirectoryPreviewContact {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Contactos SIMULADOS para visualizar el modal del Directorio.
 *
 * La historia de esta pantalla es sólo de interfaz: no consulta la API ni guarda nada. Esta lista
 * existe para que el modal tenga algo que mostrar y se reemplaza por la respuesta real del
 * directorio de la cuenta activa al integrarlo.
 */
export const DIRECTORY_PREVIEW_CONTACTS: readonly DirectoryPreviewContact[] = [
  { id: 'preview-1', firstName: 'Ana', lastName: 'García López' },
  { id: 'preview-2', firstName: 'Carlos', lastName: 'Hernández Ruiz' },
  { id: 'preview-3', firstName: 'María José', lastName: 'Martínez Soto' },
  { id: 'preview-4', firstName: 'Luis', lastName: 'Ramírez Ortega' },
  { id: 'preview-5', firstName: 'Sofía', lastName: 'Torres Medina' },
];

/**
 * Filtra en memoria los contactos simulados para que el modal enseñe sus tres estados.
 *
 * No es la búsqueda del Directorio —esa la hará el servidor—: sólo compara, sin distinguir
 * mayúsculas ni acentos, el texto escrito contra el nombre completo, para poder ver el listado
 * con resultados y el estado vacío sin conectar nada.
 *
 * @param contacts - Contactos a filtrar.
 * @param query - Texto escrito en el buscador.
 * @returns Los contactos cuyo nombre completo contiene el texto, en su orden original; todos si
 *   el texto está vacío o sólo tiene espacios.
 *
 * @throws Nada: opera sobre arreglos en memoria.
 *
 * @example
 * ```ts
 * filterDirectoryPreviewContacts(DIRECTORY_PREVIEW_CONTACTS, 'garcia');
 * // [{ id: 'preview-1', firstName: 'Ana', lastName: 'García López' }]
 * ```
 */
export function filterDirectoryPreviewContacts(
  contacts: readonly DirectoryPreviewContact[],
  query: string,
): DirectoryPreviewContact[] {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery === '') return [...contacts];

  return contacts.filter((contact) =>
    normalizeForSearch(`${contact.firstName} ${contact.lastName}`).includes(
      normalizedQuery,
    ),
  );
}

/**
 * Deja un texto listo para compararlo: recortado, en minúsculas y sin acentos.
 *
 * @param value - Texto original.
 * @returns El texto normalizado.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeForSearch('  García '); // 'garcia'
 * ```
 */
function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
