'use client';

import { useState } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import {
  createDocumentSignaturesSchema,
  countSigners,
  countViewers,
  signersWithoutPosition,
  CREATE_DOCUMENT_DEFAULT_VALUES,
  type CreateDocumentSignaturesFormValues,
} from '../_schemas';
import {
  useCreateDocumentSignatures,
  CREATE_DOCUMENT_ERROR_MESSAGE,
} from './useCreateDocumentSignatures';
import { getUploadErrorMessage } from '../_upload-errors';

interface UseCreateDocumentFormParams {
  /** Archivo ya cargado; sin él no hay nada que enviar (ver `_section-rules.ts`). */
  file: File | null;
  /** Se ejecuta tras un envío exitoso, para limpiar la selección de archivo. */
  onSubmitted: () => void;
  /** Abre la sección que contiene los errores cuando la validación del formulario falla. */
  onInvalid?: () => void;
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
  onInvalid,
}: UseCreateDocumentFormParams) {
  const currentUserQuery = useCurrentUser();
  const createDocumentSignaturesMutation = useCreateDocumentSignatures();
  /**
   * Porcentaje del documento ya subido en el envío en curso, o `null` antes de que empiece. Vive
   * aquí y no en la mutación para no cambiar la forma que devuelve `useCreateDocumentSignatures`.
   */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const form = useForm<CreateDocumentSignaturesFormValues>({
    resolver: zodResolver(createDocumentSignaturesSchema),
    mode: 'onChange',
    defaultValues: CREATE_DOCUMENT_DEFAULT_VALUES,
  });

  const collaborators = useWatch({
    control: form.control,
    name: 'collaborators',
  });
  // El resumen fijo y el encabezado del acordeón de configuración muestran el tipo elegido, así
  // que se observa acá (una sola suscripción) en vez de que cada consumidor mire el formulario.
  const signatureType = useWatch({
    control: form.control,
    name: 'signatureType',
  });
  /**
   * La aprobación y su aprobador se observan acá por el mismo motivo que el tipo de firma: la
   * sección "Configurar firma" no está completa si el documento requiere aprobación y todavía no
   * se eligió quién la da (ver `_section-progress.ts`), y esa cuenta la hace la pantalla.
   */
  const requiresApproval = useWatch({
    control: form.control,
    name: 'requiresApproval',
  });
  const reviewerUserId = useWatch({
    control: form.control,
    name: 'reviewerUserId',
  });

  function onValidSubmit(values: CreateDocumentSignaturesFormValues) {
    // Guarda redundante con `sections.submission.isEnabled` (el botón está deshabilitado sin
    // archivo): la validación del esquema no cubre el archivo, así que el envío se protege
    // también acá y no depende de que la UI haya deshabilitado el botón.
    if (!file || !values.signatureType) return;

    setUploadProgress(0);
    createDocumentSignaturesMutation.mutate(
      {
        file,
        fileName: file.name,
        requiresApproval: values.requiresApproval,
        reviewerUserId: values.reviewerUserId,
        requiresOrder: values.requiresOrder,
        signatureType: values.signatureType,
        requiresTwoFactorAuth: values.requiresTwoFactorAuth,
        isIndexable: values.isIndexable,
        // Sin composición extra: desde la historia "Crear y eliminar automáticamente el
        // participante Usuario firmante", el creador que marcó "Incluirme como firmante" ya es
        // una tarjeta más dentro de `collaborators` (la agrega `CollaboratorsFieldArray`), así que
        // agregarlo acá otra vez lo mandaría duplicado.
        collaborators: values.collaborators,
        onUploadProgress: setUploadProgress,
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
    /**
     * Lo que corre al pulsar "Enviar solicitud de firma": valida y manda la solicitud.
     *
     * Antes esto sólo validaba, y el envío real quedaba en un `submitWith` que la pantalla
     * llamaba con lo que el usuario respondiera en un modal (`SmartSearchDialog`). Esa decisión
     * ahora es un campo más del formulario (`isIndexable`, ver `SmartSearchCard`), así que no
     * queda nada que preguntar entre el botón y la petición.
     */
    handleSubmit: form.handleSubmit(onValidSubmit, onInvalid),
    /** Cuántos firmantes hay hoy en el formulario (gobierna el orden de firma). */
    signerCount: countSigners(collaborators),
    /** Cuántos espectadores hay hoy en el formulario (solo informativo: alimenta el resumen). */
    viewerCount: countViewers(collaborators),
    /** Firmantes a los que todavía les falta colocar su firma en el PDF, por nombre. */
    signersWithoutPosition: signersWithoutPosition(collaborators),
    /** Tipo de firma elegido para todo el documento (ver `SignatureTypeField`). */
    signatureType: signatureType ?? undefined,
    /** Si el documento necesita que alguien lo apruebe antes de salir a firma. */
    requiresApproval,
    /** Aprobador elegido, o `null` mientras no se haya elegido ninguno. */
    reviewerUserId,
    /** Porcentaje subido del envío en curso (ver `DocumentUploadProgress`). */
    uploadProgress,
    /** Error general de la sección de participantes (no pertenece a ningún campo). */
    participantsErrorMessage: getParticipantsErrorMessage(
      form.formState.errors,
    ),
    submitErrorMessage: createDocumentSignaturesMutation.isError
      ? getUploadErrorMessage(
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
