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
 * Un firmante NO declara su propio tipo de firma ni su identificador fiscal (ver historia
 * "Selección de tipo de firma al crear documentos"): el tipo lo define el documento completo
 * (`signatureType` en `documentConfigurationSchema`) y el RFC del flujo avanzado se extrae del
 * certificado de e.firma en el momento de firmar (ver `EfirmaService.extaerRfcDeSubject` en el
 * backend), así que pedirlo al crear el documento era capturar un dato que nadie valida ni usa.
 */
export const signerSchema = z.object({
  collaboratorType: z.literal('SIGNER'),
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
  // Ubicaciones de firma colocadas por arrastre sobre el PDF (ver historia "Ubicación de
  // firmas por usuario") — un arreglo vacío es válido: el firmante firma sin estampado visual.
  // Sin `.default()` a propósito: con `.default()` el input/output del schema divergen
  // (input optativo, output requerido), lo que rompe la inferencia de tipos de zodResolver
  // contra `CreateDocumentSignaturesFormValues`. Todo lugar que arma un SignerFormValues
  // (`emptySigner`, `buildSelfSigner`) ya manda `signatures` explícito.
  signatures: z.array(signaturePositionSchema),
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
  };
}

export function emptyWitness(): WitnessFormValues {
  return {
    collaboratorType: 'WITNESS',
    firstName: '',
    lastName: '',
    email: '',
    taxId: '',
  };
}

/** Único criterio de "cuántos firmantes hay" — lo consultan las reglas de sección y la UI. */
export function countSigners(collaborators: CollaboratorFormValues[]): number {
  return collaborators.filter(
    (collaborator) => collaborator.collaboratorType === 'SIGNER',
  ).length;
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
