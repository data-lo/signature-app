import { z } from 'zod';

export const rejectDocumentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, { message: 'Describe con más detalle el motivo del rechazo' }),
});

export type RejectDocumentFormValues = z.infer<typeof rejectDocumentSchema>;

/**
 * Solo la contraseña vive en el schema de zod — los archivos .key/.cer se manejan como estado
 * de React aparte (vía FilePond), mismo patrón que el PDF del documento en el flujo de creación
 * (ver `CreateDocumentView.tsx`/`useCreateDocumentSignatures.ts`).
 */
export const advancedSignatureSchema = z.object({
  password: z
    .string()
    .min(1, { message: 'La contraseña de la llave privada es requerida' }),
});

export type AdvancedSignatureFormValues = z.infer<
  typeof advancedSignatureSchema
>;
