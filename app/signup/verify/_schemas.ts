import { z } from 'zod';
import { formatPersonName } from '@/lib/format-person-name';

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
 * Nombre o apellido opcional, ya normalizado: cada palabra con inicial mayúscula y sin espacios
 * sobrantes. Se aplica sobre lo que se envía y no sólo en el `onBlur` del campo, que no se
 * dispara al enviar con Enter, al autocompletar ni al pegar y enviar.
 *
 * Mismo criterio que el alta (ver `registerSchema`): un usuario no puede quedar guardado de dos
 * formas distintas según por qué pantalla pasó.
 */
const optionalPersonName = (message: string) =>
  optionalText(z.string().min(1, message)).transform((value) =>
    value ? formatPersonName(value) : undefined,
  );

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
  firstName: optionalPersonName('El nombre es obligatorio'),
  lastName: optionalPersonName('El apellido es obligatorio'),
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
