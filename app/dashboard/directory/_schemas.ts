import { z } from 'zod';

import type { DirectoryContact } from './_requests';

/** Tope de nombre y apellido; el mismo que `MAX_CONTACT_NAME_LENGTH` en signature-server. */
export const MAX_DIRECTORY_CONTACT_NAME_LENGTH = 100;

/** Largo máximo de un correo según RFC 5321; el mismo que `MAX_CONTACT_EMAIL_LENGTH`. */
export const MAX_DIRECTORY_CONTACT_EMAIL_LENGTH = 254;

/**
 * Formulario de un contacto del Directorio, compartido por el alta y la edición.
 *
 * Es UN esquema para los dos modales a propósito: crear y editar capturan exactamente lo mismo,
 * y dos esquemas acabarían aceptando cosas distintas para el mismo contacto. Los topes son los
 * del DTO del backend, para que el error se vea en el campo y no como un 400 genérico; el
 * backend vuelve a validar de todas formas (y es quien detecta el correo duplicado).
 */
export const directoryContactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: 'Ingresa el nombre del contacto.' })
    .max(MAX_DIRECTORY_CONTACT_NAME_LENGTH, {
      message: `El nombre admite hasta ${MAX_DIRECTORY_CONTACT_NAME_LENGTH} caracteres.`,
    }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: 'Ingresa el apellido del contacto.' })
    .max(MAX_DIRECTORY_CONTACT_NAME_LENGTH, {
      message: `El apellido admite hasta ${MAX_DIRECTORY_CONTACT_NAME_LENGTH} caracteres.`,
    }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Ingresa el correo electrónico del contacto.' })
    .max(MAX_DIRECTORY_CONTACT_EMAIL_LENGTH, {
      message: `El correo admite hasta ${MAX_DIRECTORY_CONTACT_EMAIL_LENGTH} caracteres.`,
    })
    .email({ message: 'Ingresa un correo electrónico válido.' }),
});

export type DirectoryContactFormValues = z.infer<typeof directoryContactSchema>;

/** Valores con los que abre el formulario de alta. */
export const EMPTY_DIRECTORY_CONTACT_FORM: DirectoryContactFormValues = {
  firstName: '',
  lastName: '',
  email: '',
};

/**
 * Valores iniciales del formulario: los del contacto al editar, vacíos al crear.
 *
 * @param contact - Contacto que se edita; `null` para un alta.
 * @returns Los tres campos del formulario.
 *
 * @example
 * ```ts
 * directoryContactFormValuesOf(null); // { firstName: '', lastName: '', email: '' }
 * directoryContactFormValuesOf(contact); // { firstName: 'Ana', lastName: 'García', email: 'ana@example.com' }
 * ```
 */
export function directoryContactFormValuesOf(
  contact: DirectoryContact | null,
): DirectoryContactFormValues {
  if (!contact) return EMPTY_DIRECTORY_CONTACT_FORM;

  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
  };
}
