import { z } from 'zod';

export const selectSignerSchema = z.object({
  signerId: z.string().uuid({ message: 'Selecciona un firmante' }),
});

export type SelectSignerFormValues = z.infer<typeof selectSignerSchema>;
