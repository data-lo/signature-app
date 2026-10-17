'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTablePageHeader } from '@/components/data-table/data-table-page-header';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  MAX_DIRECTORY_SEARCH_LENGTH,
  type DirectoryContact,
} from '../_requests';
import type { DirectoryContactFormValues } from '../_schemas';
import {
  DEFAULT_DIRECTORY_PAGE_SIZE,
  DIRECTORY_SEARCH_DEBOUNCE_MS,
  useDirectoryContacts,
  type DirectoryPageSize,
} from '../_hooks/useDirectoryContacts';
import {
  useCreateDirectoryContact,
  useDeleteDirectoryContact,
  useUpdateDirectoryContact,
} from '../_hooks/useDirectoryContactMutations';
import DirectoryContactsTable from './DirectoryContactsTable';
import DirectoryContactFormDialog from './DirectoryContactFormDialog';
import DeleteDirectoryContactDialog from './DeleteDirectoryContactDialog';

/** Texto del error de carga. Dice qué hacer, no qué falló por dentro. */
export const DIRECTORY_LOAD_ERROR_MESSAGE =
  'No pudimos cargar el directorio. Vuelve a intentarlo en un momento.';

/**
 * Estado del modal de alta/edición. `contact` es el que se edita (`null` = alta) y se conserva al
 * cerrar, para que el título no cambie a "Crear contacto" durante la animación de salida.
 */
interface FormDialogState {
  open: boolean;
  contact: DirectoryContact | null;
}

/**
 * Pantalla "Directorio": la tabla de contactos de la cuenta activa con búsqueda y paginación, el
 * alta, la edición y la eliminación con confirmación.
 *
 * La búsqueda (nombre, apellido, nombre completo, correo o RFC) la resuelve el backend sobre todo
 * el directorio, no sobre la página visible. Lo tecleado se aplica tras una pausa de
 * `DIRECTORY_SEARCH_DEBOUNCE_MS`, y aplicar una búsqueda o cambiar el tamaño de página vuelve a
 * la página 1: la página en la que se estaba no significa nada en el resultado nuevo.
 *
 * Los permisos son los `DIRECTORY.*` del contexto de autorización, tanto para una cuenta
 * personal como para una organización. En una personal no se evalúa ningún rol: el backend le
 * concede los cuatro desde el catálogo (son permisos que no exigen organización, ver
 * `PERSONAL_ACCOUNT_PERMISSION_KEYS` en signature-server), así que la misma comprobación vale
 * para las dos. En una organización salen del rol del miembro:
 *
 * - `DIRECTORY.READ` muestra la tabla (la página ya lo exige para entrar).
 * - `DIRECTORY.CREATE` muestra "Crear contacto".
 * - `DIRECTORY.UPDATE` / `DIRECTORY.DELETE` muestran "Actualizar" / "Eliminar" en cada fila.
 *
 * Los errores de las mutaciones se avisan con toast desde sus hooks y el modal queda abierto
 * para corregir (p. ej. un correo ya registrado); el de la consulta se pinta dentro de la tabla.
 *
 * @returns La pantalla del Directorio.
 *
 * @example
 * ```tsx
 * <DirectoryView />
 * ```
 */
export default function DirectoryView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const accountId = activeAccount?.id ?? null;
  const { can } = usePermissions();
  const canRead = can('DIRECTORY.READ');
  const canCreate = can('DIRECTORY.CREATE');
  const canUpdate = can('DIRECTORY.UPDATE');
  const canDelete = can('DIRECTORY.DELETE');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<DirectoryPageSize>(
    DEFAULT_DIRECTORY_PAGE_SIZE,
  );
  /** Lo que hay en el input; sólo baja a `search` (y a la consulta) tras la pausa. */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [formDialog, setFormDialog] = useState<FormDialogState>({
    open: false,
    contact: null,
  });
  const [deletingContact, setDeletingContact] =
    useState<DirectoryContact | null>(null);

  const contactsQuery = useDirectoryContacts({
    accountId,
    page,
    limit: pageSize,
    search,
    enabled: canRead,
  });
  const createContact = useCreateDirectoryContact(accountId);
  const updateContact = useUpdateDirectoryContact(accountId);
  const deleteContact = useDeleteDirectoryContact(accountId);

  /**
   * Respuesta de la página o búsqueda anterior, conservada mientras llega la pedida (ver
   * `useDirectoryContacts`). Sirve para que el pie sepa cuántas páginas hay; sus filas no se
   * pintan, porque numerarían y mostrarían contactos que no son los de la página pedida.
   */
  const isShowingPreviousPage = contactsQuery.isPlaceholderData;
  const pagination = contactsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  /** Otra cuenta, otro directorio: se vuelve a la primera página y sin búsqueda. */
  useEffect(() => {
    setPage(1);
    setSearchInput('');
    setSearch('');
  }, [accountId]);

  useEffect(() => {
    if (searchInput === search) return;

    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, DIRECTORY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput, search]);

  /**
   * Con una respuesta definitiva, la página se corrige si ya no existe: pasa al eliminar el
   * último contacto de la última página, cuando el refetch trae una página menos. Con la
   * respuesta vieja (placeholder) no se corrige nada: su `totalPages` es el de otra consulta.
   */
  const lastPage = Math.max(1, totalPages);
  const isPageOutOfRange =
    pagination !== undefined && !isShowingPreviousPage && page > lastPage;

  useEffect(() => {
    if (isPageOutOfRange) setPage(lastPage);
  }, [isPageOutOfRange, lastPage]);

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para ver el directorio de esta cuenta.
      </p>
    );
  }

  const editingContact = formDialog.contact;
  const formMutation = editingContact ? updateContact : createContact;

  function closeFormDialog() {
    setFormDialog((current) => ({ ...current, open: false }));
  }

  function handleFormSubmit(values: DirectoryContactFormValues) {
    if (editingContact) {
      updateContact.mutate(
        { contactId: editingContact.id, values },
        { onSuccess: closeFormDialog },
      );
      return;
    }

    createContact.mutate(values, { onSuccess: closeFormDialog });
  }

  function handlePageSizeChange(nextPageSize: DirectoryPageSize) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function handleConfirmDelete(contactId: string) {
    deleteContact.mutate(contactId, {
      onSuccess: () => setDeletingContact(null),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTablePageHeader
        title="Directorio"
        description="Guarda contactos para reutilizarlos al configurar firmantes o testigos."
        actions={
          canCreate && (
            <Button
              onClick={() => setFormDialog({ open: true, contact: null })}
            >
              <Plus className="size-4" />
              Crear contacto
            </Button>
          )
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          type="search"
          aria-label="Buscar contactos por nombre o correo"
          placeholder="Buscar por nombre o correo"
          maxLength={MAX_DIRECTORY_SEARCH_LENGTH}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <DirectoryContactsTable
        contacts={
          isShowingPreviousPage || isPageOutOfRange
            ? []
            : (contactsQuery.data?.items ?? [])
        }
        // La página pedida y no la de la respuesta: mientras carga, el indicador ya dice a dónde
        // se va.
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        total={pagination?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        search={search}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={(contact) => setFormDialog({ open: true, contact })}
        onDelete={setDeletingContact}
        // `isPending` cubre la primera carga y cada búsqueda o tamaño nuevos (otra `queryKey` sin
        // datos); el placeholder y la página fuera de rango tampoco son un resultado definitivo.
        isLoading={
          contactsQuery.isPending || isShowingPreviousPage || isPageOutOfRange
        }
        errorMessage={
          contactsQuery.isError ? DIRECTORY_LOAD_ERROR_MESSAGE : undefined
        }
      />

      <DirectoryContactFormDialog
        open={formDialog.open}
        contact={editingContact}
        onOpenChange={(open) => !open && closeFormDialog()}
        onSubmit={handleFormSubmit}
        submitting={formMutation.isPending}
      />

      <DeleteDirectoryContactDialog
        contact={deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
        onConfirm={handleConfirmDelete}
        confirming={deleteContact.isPending}
      />
    </div>
  );
}
