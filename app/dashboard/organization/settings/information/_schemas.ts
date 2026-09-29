import { z } from 'zod';

import type {
  OrganizationProfile,
  UpdateOrganizationPayload,
} from '@/lib/api/organizations';

/**
 * RFC de persona moral (12 caracteres) o física (13). Espeja `ORGANIZATION_TAX_ID_PATTERN` de
 * `update-organization.dto.ts` en signature-server; aquí ignora mayúsculas porque el backend lo
 * guarda en mayúsculas de todos modos.
 */
const TAX_ID_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;

/** Entre 7 y 15 dígitos: la misma regla que el teléfono de "Mi información". */
const PHONE_PATTERN = /^\d{7,15}$/;

/** Un dominio de correo sin `@` ni protocolo (`acme.com`). Espeja `ORGANIZATION_DOMAIN_PATTERN`. */
const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i;

/** Largos máximos, los mismos que valida el backend. */
const NAME_MAX_LENGTH = 255;
const ADDRESS_MAX_LENGTH = 500;

/**
 * Un campo opcional: vacío es válido (se guarda como "sin capturar"); con texto, tiene que
 * cumplir el patrón.
 *
 * @param pattern - Formato que debe cumplir cuando trae algo.
 * @param message - Error que se muestra junto al campo.
 * @returns El esquema de Zod del campo.
 *
 * @example
 * ```ts
 * const phoneNumber = optionalMatching(/^\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos');
 * ```
 */
function optionalMatching(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), { message });
}

/**
 * Validación de "Información de la organización". Son las mismas reglas que aplica el backend
 * (`UpdateOrganizationDto`): se adelantan aquí para que el error aparezca junto al campo y no
 * como un 400 después de guardar.
 */
export const organizationInformationSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'El nombre de visualización es obligatorio' })
    .max(NAME_MAX_LENGTH, {
      message: `El nombre de visualización admite hasta ${NAME_MAX_LENGTH} caracteres`,
    }),
  name: z
    .string()
    .trim()
    .min(1, { message: 'La razón social es obligatoria' })
    .max(NAME_MAX_LENGTH, {
      message: `La razón social admite hasta ${NAME_MAX_LENGTH} caracteres`,
    }),
  taxId: optionalMatching(
    TAX_ID_PATTERN,
    'El RFC no tiene un formato válido (12 o 13 caracteres)',
  ),
  phoneNumber: optionalMatching(
    PHONE_PATTERN,
    'El teléfono debe tener entre 7 y 15 dígitos',
  ),
  address: z
    .string()
    .trim()
    .max(ADDRESS_MAX_LENGTH, {
      message: `El domicilio admite hasta ${ADDRESS_MAX_LENGTH} caracteres`,
    }),
  domainAllowed: optionalMatching(
    DOMAIN_PATTERN,
    'El dominio no tiene un formato válido (por ejemplo, empresa.com)',
  ),
});

export type OrganizationInformationFormValues = z.infer<
  typeof organizationInformationSchema
>;

/** Los campos del formulario, en el orden en que se muestran. */
export type OrganizationInformationField =
  keyof OrganizationInformationFormValues;

/**
 * Carga el perfil leído en el formulario: los campos sin capturar (`null`) quedan vacíos.
 *
 * @param organization - Perfil devuelto por el backend.
 * @returns Los valores iniciales del formulario.
 *
 * @example
 * ```ts
 * toOrganizationFormValues({ ...organization, taxId: null }).taxId; // ''
 * ```
 */
export function toOrganizationFormValues(
  organization: OrganizationProfile,
): OrganizationInformationFormValues {
  return {
    displayName: organization.displayName,
    name: organization.name,
    taxId: organization.taxId ?? '',
    phoneNumber: organization.phoneNumber ?? '',
    address: organization.address ?? '',
    domainAllowed: organization.domainAllowed ?? '',
  };
}

/**
 * Arma el body del guardado con SÓLO los campos que el usuario cambió.
 *
 * Mandar sólo lo modificado evita pisar lo que otro administrador haya guardado en los demás
 * campos mientras esta pantalla estaba abierta, y hace que el backend refresque el selector de
 * cuentas de todos los miembros sólo cuando de verdad cambió un nombre. Un opcional vaciado viaja
 * en `null`, que es "bórralo"; el RFC viaja en mayúsculas.
 *
 * @param values - Valores ya validados (y recortados) por el esquema.
 * @param dirtyFields - Los campos que el usuario tocó, según react-hook-form.
 * @returns El body para `updateOrganizationRequest`; vacío si no cambió nada.
 *
 * @example
 * ```ts
 * toUpdateOrganizationPayload(values, { phoneNumber: true, taxId: true });
 * // { phoneNumber: null, taxId: 'ACM010101AAA' }
 * ```
 */
export function toUpdateOrganizationPayload(
  values: OrganizationInformationFormValues,
  dirtyFields: Partial<Record<OrganizationInformationField, boolean>>,
): UpdateOrganizationPayload {
  const payload: UpdateOrganizationPayload = {};

  if (dirtyFields.displayName) payload.displayName = values.displayName;
  if (dirtyFields.name) payload.name = values.name;
  if (dirtyFields.taxId) payload.taxId = values.taxId.toUpperCase() || null;
  if (dirtyFields.phoneNumber) payload.phoneNumber = values.phoneNumber || null;
  if (dirtyFields.address) payload.address = values.address || null;
  if (dirtyFields.domainAllowed) {
    payload.domainAllowed = values.domainAllowed.toLowerCase() || null;
  }

  return payload;
}
