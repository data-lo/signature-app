import { z } from 'zod';
import { signaturePositionSchema } from './signature-position.schema';

const firstNameField = z
  .string()
  .trim()
  .min(1, { message: 'Ingresa el nombre del participante.' });
const lastNameField = z
  .string()
  .trim()
  .min(1, { message: 'Ingresa el apellido del participante.' });
const emailField = z
  .string()
  .trim()
  .min(1, { message: 'Ingresa el correo electrónico del participante.' })
  .email({ message: 'Ingresa un correo electrónico válido.' });
/** Forma de un RFC de persona física (13) o moral (12), ya normalizado. */
const TAX_ID_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/**
 * Deja un RFC como lo guarda el backend: sin espacios y en mayúsculas.
 *
 * @param value - RFC tal como se capturó.
 * @returns El RFC normalizado.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeTaxId(' peaj 800101 abc '); // 'PEAJ800101ABC'
 * ```
 */
export function normalizeTaxId(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * Indica si un RFC opcional es aceptable: vacío, o con formato de RFC mexicano.
 *
 * @param value - RFC tal como se capturó.
 * @returns `true` si está vacío o tiene formato válido.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isValidOptionalTaxId('peaj800101abc'); // true
 * isValidOptionalTaxId('ABC'); // false
 * ```
 */
export function isValidOptionalTaxId(value: string): boolean {
  const taxId = normalizeTaxId(value);
  return taxId === '' || TAX_ID_PATTERN.test(taxId);
}

/**
 * Identificador fiscal del testigo —en México, su RFC, que es lo que sigue diciendo la
 * etiqueta en pantalla—. Se llamaba `rfc` hasta la historia "Estandarizar campos de
 * colaboradores": el nombre del campo deja de dar por hecho el régimen fiscal, el dato que se
 * captura es el mismo.
 *
 * Opcional desde la historia "Eliminar campo RFC de la sección de Espectadores": un testigo
 * puede guardarse sin él. `.trim()` sigue aplicando por si acaso llega solo espacios; un string
 * vacío es válido y así viaja al backend, donde `CollaboratorPayloadDto.taxId` también lo acepta.
 */
const taxIdField = z.string().trim();

/**
 * Origen de la identidad del colaborador (historia "Enviar colaboradores desde Directorio
 * mediante usuario vinculado al crear un documento"). `MANUAL`: capturado en la tarjeta.
 * `DIRECTORY`: elegido del Directorio, con usuario vinculado; su nombre, apellido y correo se
 * muestran en solo lectura y el backend los resuelve desde `linkedUserId`.
 *
 * Los tres campos son opcionales —ausentes valen `MANUAL`, sin usuario y sin agregar al
 * Directorio— en vez de llevar `.default()`, por la misma razón que `signatures`: un `.default()`
 * separa el tipo de entrada del de salida y rompe la inferencia de `zodResolver`.
 */
export const collaboratorSourceSchema = z.enum(['MANUAL', 'DIRECTORY']);
export type CollaboratorSource = z.infer<typeof collaboratorSourceSchema>;

const directoryFields = {
  source: collaboratorSourceSchema.optional(),
  /** `users.id` del usuario vinculado al contacto. Sólo con `source: 'DIRECTORY'`. */
  linkedUserId: z.string().optional(),
  /** Casilla "Agregar al directorio" de la tarjeta. Sólo cuenta para `MANUAL`. */
  addToDirectory: z.boolean().optional(),
};

/**
 * Un firmante NO declara su propio tipo de firma (ver historia "Selección de tipo de firma al
 * crear documentos"): lo define el documento completo (`signatureType` en
 * `documentConfigurationSchema`).
 *
 * `signerTaxId` es el RFC opcional de un firmante FIEL (historia "Validar RFC del firmante FIEL
 * contra el certificado al momento de firmar"). Su formato se valida en
 * `createDocumentSignaturesSchema`, que es donde se conoce el tipo de firma: un RFC escrito antes
 * de cambiar a firma simple queda oculto y no debe impedir el envío.
 */
export const signerSchema = z.object({
  collaboratorType: z.literal('SIGNER'),
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
  signerTaxId: z.string().optional(),
  // Ubicaciones de firma colocadas por arrastre sobre el PDF (ver historia "Ubicación de
  // firmas por usuario"). El arreglo vacío es un estado válido MIENTRAS se llena el formulario
  // —el firmante se agrega antes de colocar su firma—, pero no se puede enviar así: lo impide
  // `createDocumentSignaturesSchema` (historia "Hacer obligatorias las coordenadas de posición de
  // firma"). Sin `.default()` a propósito: con `.default()` el input/output del schema divergen
  // (input optativo, output requerido), lo que rompe la inferencia de tipos de zodResolver
  // contra `CreateDocumentSignaturesFormValues`. Todo lugar que arma un SignerFormValues
  // (`emptySigner`, `buildSelfSigner`) ya manda `signatures` explícito.
  signatures: z.array(signaturePositionSchema),
  ...directoryFields,
  // Marca al firmante que representa al usuario en sesión, agregado por "Incluirme como
  // firmante". Es lo que permite ubicarlo para quitarlo al desmarcar y no duplicarlo si la opción
  // se marca más de una vez (ver `_mappers/self-signer.mapper.ts`). No viaja al backend: el
  // payload se arma campo por campo en `toCollaboratorPayload`, donde este no aparece — para el
  // servidor el creador es un firmante más. Sin `.default()`, por la misma razón que `signatures`.
  isSelf: z.boolean(),
});

/**
 * El identificador fiscal sobrevive solo acá: un testigo no firma, así que no hay certificado
 * del que leerlo.
 */
export const witnessSchema = z.object({
  collaboratorType: z.literal('WITNESS'),
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
  taxId: taxIdField,
  ...directoryFields,
});

/** Firmantes y testigos viven en un solo arreglo, diferenciados por `collaboratorType`. */
export const collaboratorSchema = z.discriminatedUnion('collaboratorType', [
  signerSchema,
  witnessSchema,
]);

export type SignerFormValues = z.infer<typeof signerSchema>;
export type WitnessFormValues = z.infer<typeof witnessSchema>;
export type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

export function emptySigner(): SignerFormValues {
  return {
    collaboratorType: 'SIGNER',
    firstName: '',
    lastName: '',
    email: '',
    signatures: [],
    isSelf: false,
    source: 'MANUAL',
    addToDirectory: false,
  };
}

export function emptyWitness(): WitnessFormValues {
  return {
    collaboratorType: 'WITNESS',
    firstName: '',
    lastName: '',
    email: '',
    taxId: '',
    source: 'MANUAL',
    addToDirectory: false,
  };
}

/** Lo que el modal del Directorio necesita de un contacto para convertirlo en colaborador. */
export interface DirectoryContactSelection {
  firstName: string;
  lastName: string;
  email: string;
  /** `null` si el contacto no tiene usuario de la plataforma vinculado. */
  linkedUserId: string | null;
}

/**
 * Convierte un contacto elegido en el Directorio en la tarjeta de firmante o testigo.
 *
 * Con usuario vinculado nace como `DIRECTORY`: la tarjeta muestra su nombre y correo en solo
 * lectura y al enviar sólo viaja `linkedUserId`. Sin usuario vinculado no hay a quién resolver
 * en el backend, así que nace como `MANUAL` con los datos del contacto ya capturados (editables)
 * y sin "Agregar al directorio", porque ya está en él.
 *
 * @param contact - Contacto elegido.
 * @param collaboratorType - Si se agrega como firmante o como testigo.
 * @returns Los valores de la tarjeta, listos para `append`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * collaboratorFromDirectoryContact(
 *   { firstName: 'Ana', lastName: 'García', email: 'ana@example.com', linkedUserId: 'user-1' },
 *   'SIGNER',
 * ); // { collaboratorType: 'SIGNER', source: 'DIRECTORY', linkedUserId: 'user-1', … }
 * ```
 */
export function collaboratorFromDirectoryContact(
  contact: DirectoryContactSelection,
  collaboratorType: CollaboratorFormValues['collaboratorType'],
): CollaboratorFormValues {
  const identity = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    addToDirectory: false,
    ...(contact.linkedUserId
      ? { source: 'DIRECTORY' as const, linkedUserId: contact.linkedUserId }
      : { source: 'MANUAL' as const }),
  };

  return collaboratorType === 'SIGNER'
    ? { ...emptySigner(), ...identity }
    : { ...emptyWitness(), ...identity };
}

/**
 * Es un colaborador elegido del Directorio con usuario vinculado: su identidad la resuelve el
 * backend y en pantalla no se edita.
 *
 * @param collaborator - Colaborador del formulario.
 * @returns `true` sólo con `source: 'DIRECTORY'`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isDirectoryCollaborator({ ...emptySigner(), source: 'DIRECTORY' }); // true
 * ```
 */
export function isDirectoryCollaborator(
  collaborator: Pick<CollaboratorFormValues, 'source'>,
): boolean {
  return collaborator.source === 'DIRECTORY';
}

/** Único criterio de "cuántos firmantes hay" — lo consultan las reglas de sección y la UI. */
export function countSigners(collaborators: CollaboratorFormValues[]): number {
  return collaborators.filter(
    (collaborator) => collaborator.collaboratorType === 'SIGNER',
  ).length;
}

/**
 * Nombre con el que se identifica a un firmante en los mensajes de la pantalla: su nombre
 * completo, o su correo si todavía no lo capturó, o su posición en la lista si no tiene ninguno.
 */
function signerLabel(signer: SignerFormValues, signerNumber: number): string {
  const fullName = `${signer.firstName} ${signer.lastName}`.trim();
  return fullName || signer.email.trim() || `Firmante ${signerNumber}`;
}

/**
 * Firmantes que todavía no tienen ninguna ubicación de firma colocada sobre el PDF, por nombre y
 * en el orden de la lista. Único criterio de "falta ubicar firmas": lo consultan el esquema (que
 * bloquea el envío) y la pantalla (que dice a quién le falta).
 *
 * @param collaborators - Colaboradores del formulario.
 * @returns Los nombres de los firmantes sin posición; vacío si a nadie le falta.
 *
 * @example
 * ```ts
 * signersWithoutPosition([juanSinFirma, mariaConFirma]); // ['Juan Pérez']
 * ```
 */
export function signersWithoutPosition(
  collaborators: CollaboratorFormValues[],
): string[] {
  return collaborators
    .filter(
      (collaborator): collaborator is SignerFormValues =>
        collaborator.collaboratorType === 'SIGNER',
    )
    .map((signer, index) => ({ signer, label: signerLabel(signer, index + 1) }))
    .filter(({ signer }) => signer.signatures.length === 0)
    .map(({ label }) => label);
}

/** Contraparte de `countSigners` para el resumen de la solicitud (ver `_section-progress.ts`). */
export function countWitnesses(
  collaborators: CollaboratorFormValues[],
): number {
  return collaborators.filter(
    (collaborator) => collaborator.collaboratorType === 'WITNESS',
  ).length;
}

/** Es el firmante que representa al usuario en sesión (no uno capturado a mano). */
export function isSelfSigner(collaborator: CollaboratorFormValues): boolean {
  return collaborator.collaboratorType === 'SIGNER' && collaborator.isSelf;
}

/**
 * Posición del firmante propio dentro de la lista, o -1 si no está. Único criterio de "¿ya está
 * agregado?": lo consultan tanto la decisión de sincronización como la UI, para que no puedan
 * discrepar sobre qué tarjeta es la del usuario en sesión.
 */
export function findSelfSignerIndex(
  collaborators: CollaboratorFormValues[],
): number {
  return collaborators.findIndex(isSelfSigner);
}
