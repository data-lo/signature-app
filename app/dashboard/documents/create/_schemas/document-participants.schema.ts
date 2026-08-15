import { z } from 'zod';
import { collaboratorSchema } from './collaborator.schema';

/**
 * Esquema de la sección "Participantes" (`DocumentParticipantsSection`). Solo valida la forma de
 * cada colaborador: la regla de "tiene que haber al menos un firmante" vive en el esquema
 * compuesto (`create-document-signatures.schema.ts`), que es donde se pueden ver los valores de
 * todas las secciones a la vez.
 */
export const documentParticipantsSchema = z.object({
  collaborators: z.array(collaboratorSchema),
});

export type DocumentParticipantsFormValues = z.infer<
  typeof documentParticipantsSchema
>;
