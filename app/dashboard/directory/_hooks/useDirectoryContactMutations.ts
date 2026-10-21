'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getErrorMessage } from '@/lib/error-handler';
import {
  createDirectoryContactRequest,
  deleteDirectoryContactRequest,
  updateDirectoryContactRequest,
  type SaveDirectoryContactValues,
} from '../_requests';
import { directoryContactsQueryKey } from './useDirectoryContacts';
import { logSafeError } from '@/lib/observability/safe-log';

/**
 * Alta de un contacto en el Directorio de la cuenta activa.
 *
 * Al terminar invalida todas las páginas del directorio de esa cuenta; un error (p. ej. el 409
 * de correo duplicado) se avisa con un toast con el mensaje del backend.
 *
 * @param accountId - Cuenta activa, para invalidar su directorio.
 * @returns La mutación de TanStack Query; `mutate` recibe nombre, apellido y correo.
 *
 * @example
 * ```ts
 * const createContact = useCreateDirectoryContact(activeAccount?.id ?? null);
 * createContact.mutate(values, { onSuccess: closeDialog });
 * ```
 */
export function useCreateDirectoryContact(accountId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SaveDirectoryContactValues) =>
      createDirectoryContactRequest(values),
    onSuccess: () => {
      toast.success('Contacto creado correctamente');
      queryClient.invalidateQueries({
        queryKey: directoryContactsQueryKey(accountId),
      });
    },
    onError: (error) => {
      logSafeError('[directory] falló crear el contacto', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear el contacto. Intenta de nuevo.',
        ),
      );
    },
  });
}

/**
 * Edición de nombre, apellido y correo de un contacto del Directorio.
 *
 * @param accountId - Cuenta activa, para invalidar su directorio.
 * @returns La mutación; `mutate` recibe `{ contactId, values }`.
 *
 * @example
 * ```ts
 * const updateContact = useUpdateDirectoryContact(activeAccount?.id ?? null);
 * updateContact.mutate({ contactId: contact.id, values });
 * ```
 */
export function useUpdateDirectoryContact(accountId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      values,
    }: {
      contactId: string;
      values: SaveDirectoryContactValues;
    }) => updateDirectoryContactRequest(contactId, values),
    onSuccess: () => {
      toast.success('Contacto actualizado correctamente');
      queryClient.invalidateQueries({
        queryKey: directoryContactsQueryKey(accountId),
      });
    },
    onError: (error) => {
      logSafeError('[directory] falló actualizar el contacto', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al actualizar el contacto. Intenta de nuevo.',
        ),
      );
    },
  });
}

/**
 * Eliminación (archivado en el backend) de un contacto del Directorio.
 *
 * Tras completarse invalida el directorio, que es lo que hace desaparecer la fila de la tabla.
 *
 * @param accountId - Cuenta activa, para invalidar su directorio.
 * @returns La mutación; `mutate` recibe el id del contacto.
 *
 * @example
 * ```ts
 * const deleteContact = useDeleteDirectoryContact(activeAccount?.id ?? null);
 * deleteContact.mutate(contact.id, { onSuccess: closeDialog });
 * ```
 */
export function useDeleteDirectoryContact(accountId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => deleteDirectoryContactRequest(contactId),
    onSuccess: () => {
      toast.success('Contacto eliminado correctamente');
      queryClient.invalidateQueries({
        queryKey: directoryContactsQueryKey(accountId),
      });
    },
    onError: (error) => {
      logSafeError('[directory] falló eliminar el contacto', error);
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al eliminar el contacto. Intenta de nuevo.',
        ),
      );
    },
  });
}
