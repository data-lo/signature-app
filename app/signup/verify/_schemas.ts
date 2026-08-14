import { z } from 'zod';

export const verifyOtpSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d+$/, 'El código solo debe contener números'),
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

/** Un campo que se deja vacío significa "no lo cambies", así que se envía como `undefined`. */
const optionalText = (schema: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .pipe(schema.optional());

/**
 * Corrección de los datos del registro pendiente. El correo y la contraseña son obligatorios
 * porque identifican y autorizan la operación; el resto solo se valida si viene con algo, para
 * que quien únicamente quiere arreglar su correo no tenga que reescribir CURP y RFC.
 */
export const editPreRegistrationSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(1, 'Escribe la contraseña que elegiste al registrarte'),
  firstName: optionalText(z.string().min(1, 'El nombre es obligatorio')),
  lastName: optionalText(z.string().min(1, 'El apellido es obligatorio')),
  nationalId: optionalText(
    z.string().length(18, 'El CURP debe tener 18 caracteres'),
  ),
  rfc: optionalText(
    z
      .string()
      .min(12, 'El RFC debe tener 12 o 13 caracteres')
      .max(13, 'El RFC debe tener 12 o 13 caracteres')
      .regex(/^[A-Za-z0-9]+$/, 'El RFC solo debe contener letras y números'),
  ),
});

export type EditPreRegistrationFormValues = z.input<
  typeof editPreRegistrationSchema
>;
export type EditPreRegistrationValues = z.output<
  typeof editPreRegistrationSchema
>;
