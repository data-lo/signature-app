'use client';

import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { getErrorMessage } from '@/lib/error-handler';
import {
  createDocumentSignaturesSchema,
  countSigners,
  CREATE_DOCUMENT_DEFAULT_VALUES,
  type CreateDocumentSignaturesFormValues,
} from '../_schemas';
import { buildSubmissionCollaborators } from '../_mappers/submission-collaborators.mapper';
import {
  useCreateDocumentSignatures,
  CREATE_DOCUMENT_ERROR_MESSAGE,
} from './useCreateDocumentSignatures';

interface UseCreateDocumentFormParams {
  /** Archivo ya cargado; sin él no hay nada que enviar (ver `_section-rules.ts`). */
  file: File | null;
  /** Se ejecuta tras un envío exitoso, para limpiar la selección de archivo. */
  onSubmitted: () => void;
}

/**
 * Toda la lógica del formulario de carga y configuración: valores iniciales, validación contra
 * el esquema, composición de los colaboradores que se envían y limpieza tras un envío exitoso.
 * La pantalla (`CreateDocumentView`) solo compone secciones y les pasa lo que este hook expone.
 *
 * Las consultas y mutaciones se devuelven como instancias con nombre (`currentUserQuery`,
 * `createDocumentSignaturesMutation`) en vez de desestructuradas: así cada consumidor lee
 * `createDocumentSignaturesMutation.isPending` sin alias ni ambigüedad sobre a qué operación
 * pertenece cada propiedad.
 */
export function useCreateDocumentForm({
  file,
  onSubmitted,
}: UseCreateDocumentFormParams) {
  const currentUserQuery = useCurrentUser();
  const createDocumentSignaturesMutation = useCreateDocumentSignatures();

  const form = useForm<CreateDocumentSignaturesFormValues>({
    resolver: zodResolver(createDocumentSignaturesSchema),
    mode: 'onChange',
    defaultValues: CREATE_DOCUMENT_DEFAULT_VALUES,
  });

  const collaborators = useWatch({
    control: form.control,
    name: 'collaborators',
  });

  function onValidSubmit(values: CreateDocumentSignaturesFormValues) {
    // Guarda redundante con `sections.submission.isEnabled` (el botón está deshabilitado sin
    // archivo): la validación del esquema no cubre el archivo, así que el envío se protege
    // también acá y no depende de que la UI haya deshabilitado el botón.
    if (!file) return;

    createDocumentSignaturesMutation.mutate(
      {
        file,
        fileName: file.name,
        requiresApproval: values.requiresApproval,
        requiresOrder: values.requiresOrder,
        collaborators: buildSubmissionCollaborators(
          values,
          currentUserQuery.data,
        ),
      },
      {
        onSuccess: () => {
          form.reset(CREATE_DOCUMENT_DEFAULT_VALUES);
          onSubmitted();
        },
      },
    );
  }

  return {
    form,
    currentUserQuery,
    createDocumentSignaturesMutation,
    handleSubmit: form.handleSubmit(onValidSubmit),
    /** Cuántos firmantes hay hoy en el formulario (gobierna el orden de firma). */
    signerCount: countSigners(collaborators),
    /** Error general de la sección de participantes (no pertenece a ningún campo). */
    participantsErrorMessage: getParticipantsErrorMessage(
      form.formState.errors,
    ),
    submitErrorMessage: createDocumentSignaturesMutation.isError
      ? getErrorMessage(
          createDocumentSignaturesMutation.error,
          CREATE_DOCUMENT_ERROR_MESSAGE,
        )
      : undefined,
  };
}

/**
 * El error de "agrega al menos un firmante" lo emite el `superRefine` del esquema apuntando al
 * arreglo completo: react-hook-form lo deja en `collaborators.message` o en `collaborators.root`
 * según cómo se haya disparado la validación, así que se consultan ambos.
 */
function getParticipantsErrorMessage(
  errors: FieldErrors<CreateDocumentSignaturesFormValues>,
): string | undefined {
  return (
    errors.collaborators?.message ??
    (errors.collaborators?.root as { message?: string } | undefined)?.message
  );
}
