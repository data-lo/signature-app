'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTablePageHeader } from '@/components/data-table/data-table-page-header';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { DirectoryContact } from '../_requests';
import type { DirectoryContactFormValues } from '../_schemas';
import {
  DIRECTORY_CONTACTS_PAGE_SIZE,
  useDirectoryContacts,
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
 * Pantalla "Directorio": la tabla de contactos de la cuenta activa, el alta, la edición y la
 * eliminación con confirmación.
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
  const [formDialog, setFormDialog] = useState<FormDialogState>({
    open: false,
    contact: null,
  });
  const [deletingContact, setDeletingContact] =
    useState<DirectoryContact | null>(null);

  const contactsQuery = useDirectoryContacts(accountId, page, canRead);
  const createContact = useCreateDirectoryContact(accountId);
  const updateContact = useUpdateDirectoryContact(accountId);
  const deleteContact = useDeleteDirectoryContact(accountId);

  const totalPages = contactsQuery.data?.pagination.totalPages ?? 1;

  /** Otra cuenta, otro directorio: se vuelve a la primera página. */
  useEffect(() => {
    setPage(1);
  }, [accountId]);

  /**
   * Al eliminar el último contacto de la última página, esa página deja de existir: se baja a la
   * última que queda en vez de dejar la tabla vacía con contactos en páginas anteriores.
   */
  useEffect(() => {
    const lastPage = Math.max(1, totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [page, totalPages]);

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

      <DirectoryContactsTable
        contacts={contactsQuery.data?.items ?? []}
        page={page}
        pageSize={DIRECTORY_CONTACTS_PAGE_SIZE}
        totalPages={totalPages}
        onPageChange={setPage}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={(contact) => setFormDialog({ open: true, contact })}
        onDelete={setDeletingContact}
        isLoading={contactsQuery.isLoading}
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
