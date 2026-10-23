import { documentConfigurationSchema } from './document-configuration.schema';
import { documentParticipantsSchema } from './document-participants.schema';
import { countSigners } from './collaborator.schema';
import { z } from 'zod';

/** Por qué no se puede enviar la solicitud mientras algún firmante no tenga su firma ubicada. */
export const SIGNATURE_POSITION_REQUIRED_MESSAGE =
  'Es obligatorio seleccionar la ubicación de la firma de cada firmante en el documento antes de continuar.';

/** Encabezado del aviso de error que acompaña a `SIGNATURE_POSITION_REQUIRED_MESSAGE` junto al botón de envío. */
export const SIGNATURE_POSITION_REQUIRED_TITLE = 'Falta ubicar la firma';

/**
 * Esquema del formulario completo de la pantalla: la composición de los esquemas de cada sección
 * más las reglas que ninguna sección puede validar sola. El archivo PDF no forma parte de estos
 * valores — vive fuera de react-hook-form (ver `_hooks/useDocumentFileSelection.ts`) porque lo
 * gobierna FilePond, y su requisito se expresa como regla de activación (`_section-rules.ts`),
 * no como campo del formulario.
 */
export const createDocumentSignaturesSchema = documentConfigurationSchema
  .extend(documentParticipantsSchema.shape)
  .superRefine((values, ctx) => {
    if (values.signatureType === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona el tipo de firma',
        path: ['signatureType'],
      });
    }

    // Basta con contar el arreglo: desde la historia "Crear y eliminar automáticamente el
    // participante Usuario firmante", marcar "Incluirme como firmante" inserta al creador como
    // una tarjeta SIGNER más, así que `countSigners` ya lo incluye. Antes esta regla tenía que
    // mirar además el checkbox porque ese firmante no existía hasta el envío — y eso hacía que el
    // formulario se diera por válido en un caso en el que no lo estaba: con la opción marcada
    // pero el perfil sin cargar, no había a quién agregar y se enviaba un documento sin firmantes.
    if (countSigners(values.collaborators) === 0) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Agrega al menos un firmante o inclúyete como firmante para continuar.',
        path: ['collaborators'],
      });
    }

    // Historia "Hacer obligatorias las coordenadas de posición de firma": cada firmante necesita
    // al menos una ubicación en el PDF. El error va en el campo `signatures` de cada firmante y no
    // en el arreglo, para no mezclarse con el mensaje general de la sección de participantes. Lo
    // que ve el usuario es el aviso junto al botón de envío (ver `_section-progress.ts`); esto es
    // lo que impide el envío aunque el botón se habilitara por otro camino.
    values.collaborators.forEach((collaborator, index) => {
      if (
        collaborator.collaboratorType === 'SIGNER' &&
        collaborator.signatures.length === 0
      ) {
        ctx.addIssue({
          code: 'custom',
          message: SIGNATURE_POSITION_REQUIRED_MESSAGE,
          path: ['collaborators', index, 'signatures'],
        });
      }
    });
  });

export type CreateDocumentSignaturesFormValues = z.infer<
  typeof createDocumentSignaturesSchema
>;

/** Estado inicial del formulario y estado al que vuelve tras un envío exitoso. */
export const CREATE_DOCUMENT_DEFAULT_VALUES: CreateDocumentSignaturesFormValues =
  {
    // El tipo de firma debe elegirse explícitamente antes de poder enviar la solicitud.
    signatureType: null,
    requiresTwoFactorAuth: true,
    requiresApproval: false,
    // Sin aprobación no hay aprobador: el campo sólo toma valor cuando el usuario marca la opción
    // y elige a alguien (ver `ApproverUserField`).
    reviewerUserId: null,
    includeMeAsSigner: false,
    requiresOrder: false,
    /**
     * La regla de producto es que todo documento sea encontrable salvo que su autor decida lo
     * contrario, así que la casilla arranca marcada. Es el mismo valor que ofrecía por omisión el
     * modal que esta card reemplaza: ahí era el botón primario, el camino de menor resistencia.
     */
    isIndexable: true,
    collaborators: [],
  };
