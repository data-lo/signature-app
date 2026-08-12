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
    // Regla cruzada (participantes × configuración): "Incluirme como firmante" cuenta como
    // firmante aunque el arreglo manual esté vacío o solo tenga espectadores — el firmante "yo"
    // se agrega al enviar (ver `_mappers/submission-collaborators.mapper.ts`), no en el arreglo.
    if (countSigners(values.collaborators) === 0 && !values.includeMeAsSigner) {
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
    requiresApproval: false,
    includeMeAsSigner: false,
    requiresOrder: false,
    collaborators: [],
  };
