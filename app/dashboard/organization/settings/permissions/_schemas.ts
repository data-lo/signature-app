import { z } from 'zod';

export const createPermissionSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es obligatorio' }),
});

export type CreatePermissionFormValues = z.infer<typeof createPermissionSchema>;
