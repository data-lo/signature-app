import { z } from 'zod';
import { formatPersonName } from '@/lib/format-person-name';

/**
 * Nombre o apellido, ya normalizado: cada palabra con inicial mayúscula, sin espacios sobrantes.
 *
 * La normalización vive en el esquema y no sólo en el `onBlur` del campo porque el `onBlur` no
 * se dispara en todos los caminos de envío —Enter sin salir del campo, autocompletado del
 * navegador, pegar y enviar— y en esos casos se mandaba el valor tal cual se tecleó. Acá se
 * aplica sobre lo que de verdad se envía.
 *
 * El `trim()` va antes del `min(1)` para que un campo de puros espacios se rechace como vacío,
 * que es lo que es.
 */
const personNameSchema = (message: string) =>
  z.string().trim().min(1, message).transform(formatPersonName);

export const registerSchema = z
  .object({
    firstName: personNameSchema('El nombre es obligatorio'),
    lastName: personNameSchema('El apellido es obligatorio'),
    email: z
      .string()
      .min(1, 'El correo es obligatorio')
      .email('Correo electrónico inválido'),
    nationalId: z.string().length(18, 'El CURP debe tener 18 caracteres'),
    rfc: z
      .string()
      .min(12, 'El RFC debe tener 12 o 13 caracteres')
      .max(13, 'El RFC debe tener 12 o 13 caracteres')
      .regex(/^[A-Za-z0-9]+$/, 'El RFC solo debe contener letras y números'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

/** Lo que se teclea en el formulario (sin normalizar todavía). */
export type RegisterFormValues = z.input<typeof registerSchema>;

/** Lo que sale del esquema y viaja al backend, ya con el nombre y el apellido normalizados. */
export type RegisterValues = z.output<typeof registerSchema>;
