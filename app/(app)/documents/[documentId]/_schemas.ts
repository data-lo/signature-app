import { z } from 'zod';

export const rejectDocumentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, { message: 'Describe con más detalle el motivo del rechazo' }),
});

export type RejectDocumentFormValues = z.infer<typeof rejectDocumentSchema>;
