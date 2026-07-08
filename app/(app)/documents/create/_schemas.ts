import { z } from 'zod';

export const selectParticipantsSchema = z
  .object({
    signerIds: z.array(z.string().uuid()).min(1, { message: 'Selecciona al menos un firmante' }),
    spectatorIds: z.array(z.string().uuid()),
  })
  .refine(
    (values) => !values.signerIds.some((id) => values.spectatorIds.includes(id)),
    { message: 'Un participante no puede ser firmante y espectador a la vez', path: ['spectatorIds'] },
  );

export type SelectParticipantsFormValues = z.infer<typeof selectParticipantsSchema>;
