import apiClient from '@/lib/axios';

/**
 * Un contacto del Directorio tal como lo publica `GET /api/v1/directory/contacts` — espejo
 * parcial de `DirectoryContactResponse` en signature-server. Sólo se declara lo que esta
 * pantalla usa; el resto de campos (`taxId`, `phone`, `linkedUserId`…) llega igual y se ignora.
 */
export interface DirectoryContact {
  id: string;
  firstName: string;
  lastName: string;
  /** Normalizado por el backend (recortado y en minúsculas): es único dentro del directorio. */
  email: string;
  /** Fecha de registro del contacto, en ISO 8601. */
  createdAt: string;
}

/** Paginación del listado, con la misma forma que la del listado de documentos. */
export interface DirectoryContactsPagination {
  page: number;
  limit: number;
  total: number;
  /** `ceil(total / limit)`; vale 0 cuando el directorio está vacío. */
  totalPages: number;
}

export interface DirectoryContactsPage {
  items: DirectoryContact[];
  pagination: DirectoryContactsPagination;
}

/** Lo que se captura en el formulario de alta y de edición. */
export interface SaveDirectoryContactValues {
  firstName: string;
  lastName: string;
  email: string;
}

/** Ruta base del recurso. El directorio no viaja en la URL: lo resuelve el backend desde `X-Account-Id`. */
const DIRECTORY_CONTACTS_PATH = '/api/v1/directory/contacts';

/** Tope de la búsqueda libre; el mismo `MAX_SEARCH_LENGTH` de `ListDirectoryContactsDto`. */
export const MAX_DIRECTORY_SEARCH_LENGTH = 200;

/** Query de `GET /directory/contacts`. */
export interface ListDirectoryContactsParams {
  page: number;
  limit: number;
  /**
   * Búsqueda libre por nombre, apellido, nombre completo, correo o RFC, sin distinguir
   * mayúsculas. Vacía o ausente lista todo el directorio.
   */
  search?: string;
}

/**
 * Pide una página de contactos vigentes del directorio de la cuenta activa, filtrada
 * opcionalmente por una búsqueda libre.
 *
 * La cuenta la pone `apiClient` en el header `X-Account-Id`; el backend resuelve con ella el
 * directorio (el personal o el de la organización) y exige `DIRECTORY.READ`. Una búsqueda vacía
 * o de sólo espacios no viaja: mandar `search=` sería pedir lo mismo con otra URL.
 *
 * @param params.page - Página, base 1.
 * @param params.limit - Contactos por página (1 a 100).
 * @param params.search - Texto a buscar; se recorta y se omite si queda vacío.
 * @returns La página con sus contactos y la paginación; `items` vacío si nada coincide.
 *
 * @throws {AxiosError} 403 sin `DIRECTORY.READ`; 400 si la paginación está fuera de rango o la
 *   búsqueda pasa de 200 caracteres.
 *
 * @example
 * ```ts
 * const { items, pagination } = await listDirectoryContactsRequest({
 *   page: 1,
 *   limit: 25,
 *   search: 'garcia',
 * });
 * ```
 */
export async function listDirectoryContactsRequest({
  page,
  limit,
  search,
}: ListDirectoryContactsParams): Promise<DirectoryContactsPage> {
  const trimmedSearch = search?.trim();
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DirectoryContactsPage;
  }>(DIRECTORY_CONTACTS_PATH, {
    params: {
      page,
      limit,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    },
  });

  return data.data;
}

/**
 * Da de alta un contacto en el directorio de la cuenta activa.
 *
 * Si el correo pertenecía a un contacto archivado, el backend lo reactiva en vez de duplicarlo.
 *
 * @param values - Nombre, apellido y correo.
 * @returns El contacto creado.
 *
 * @throws {AxiosError} 409 si ya hay un contacto vigente con ese correo; 403 sin
 *   `DIRECTORY.CREATE`; 400 si el cuerpo es inválido.
 *
 * @example
 * ```ts
 * await createDirectoryContactRequest({ firstName: 'Ana', lastName: 'García', email: 'ana@example.com' });
 * ```
 */
export async function createDirectoryContactRequest(
  values: SaveDirectoryContactValues,
): Promise<DirectoryContact> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: DirectoryContact;
  }>(DIRECTORY_CONTACTS_PATH, values);

  return data.data;
}

/**
 * Actualiza nombre, apellido y correo de un contacto del directorio activo.
 *
 * @param contactId - Contacto a actualizar.
 * @param values - Los tres campos del formulario; el backend acepta también un subconjunto.
 * @returns El contacto actualizado.
 *
 * @throws {AxiosError} 404 si el contacto ya no está vigente; 409 si el correo nuevo ya está
 *   en uso; 403 sin `DIRECTORY.UPDATE`.
 *
 * @example
 * ```ts
 * await updateDirectoryContactRequest('3f1c…', { firstName: 'Ana', lastName: 'López', email: 'ana@example.com' });
 * ```
 */
export async function updateDirectoryContactRequest(
  contactId: string,
  values: Partial<SaveDirectoryContactValues>,
): Promise<DirectoryContact> {
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: DirectoryContact;
  }>(`${DIRECTORY_CONTACTS_PATH}/${contactId}`, values);

  return data.data;
}

/**
 * Elimina un contacto del directorio activo.
 *
 * Para el usuario es "eliminar"; en el backend es un archivado (`archivedAt`): el contacto deja
 * de listarse y su correo queda libre para volver a darlo de alta.
 *
 * @param contactId - Contacto a eliminar.
 * @returns Nada; la tabla se refresca invalidando su consulta.
 *
 * @throws {AxiosError} 404 si el contacto ya no está vigente; 403 sin `DIRECTORY.DELETE`.
 *
 * @example
 * ```ts
 * await deleteDirectoryContactRequest('3f1c…');
 * ```
 */
export async function deleteDirectoryContactRequest(
  contactId: string,
): Promise<void> {
  await apiClient.delete(`${DIRECTORY_CONTACTS_PATH}/${contactId}`);
}
