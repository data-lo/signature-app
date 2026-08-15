import { documentConfigurationSchema } from './document-configuration.schema';
import { documentParticipantsSchema } from './document-participants.schema';
import { countSigners } from './collaborator.schema';
import { z } from 'zod';

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
          'Agrega al menos un firmante, o marca "Incluirme como firmante"',
        path: ['collaborators'],
      });
    }
  });

export type CreateDocumentSignaturesFormValues = z.infer<
  typeof createDocumentSignaturesSchema
>;

/** Estado inicial del formulario y estado al que vuelve tras un envío exitoso. */
export const CREATE_DOCUMENT_DEFAULT_VALUES: CreateDocumentSignaturesFormValues =
  {
    // Firma simple por defecto: es el flujo que no le exige nada extra al firmante (la avanzada
    // le pide su .cer/.key de e.firma al momento de firmar), así que se elige explícitamente.
    signatureType: 'SIMPLE',
    requiresApproval: false,
    includeMeAsSigner: false,
    requiresOrder: false,
    collaborators: [],
  };
