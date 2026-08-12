import { z } from 'zod';
import { collaboratorSchema } from './collaborator.schema';

/**
 * Esquema de la sección "Participantes" (`DocumentParticipantsSection`). Solo valida la forma de
 * cada colaborador: la regla de "tiene que haber al menos un firmante" NO vive aquí porque
 * depende también de la sección de configuración ("Incluirme como firmante") — las reglas que
 * cruzan secciones viven en el esquema compuesto (`create-document-signatures.schema.ts`).
 */
export const documentParticipantsSchema = z.object({
  collaborators: z.array(collaboratorSchema),
});

export type DocumentParticipantsFormValues = z.infer<
  typeof documentParticipantsSchema
>;
