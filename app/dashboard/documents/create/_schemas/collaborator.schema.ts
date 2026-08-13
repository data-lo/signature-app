import { z } from 'zod';
import { signaturePositionSchema } from './signature-position.schema';

const nameField = z.string().trim().min(1, { message: 'Requerido' });
const emailField = z
  .string()
  .trim()
  .min(1, { message: 'Requerido' })
  .email({ message: 'Correo inválido' });
const rfcField = z.string().trim().min(1, { message: 'El RFC es obligatorio' });

/**
 * Un firmante NO declara su propio tipo de firma ni su RFC (ver historia "Selección de tipo de
 * firma al crear documentos"): el tipo lo define el documento completo (`signatureType` en
 * `documentConfigurationSchema`) y el RFC del flujo avanzado se extrae del certificado de e.firma
 * en el momento de firmar (ver `EfirmaService.extaerRfcDeSubject` en el backend), así que pedirlo
 * al crear el documento era capturar un dato que nadie valida ni usa.
 */
export const signerSchema = z.object({
  collaboratorType: z.literal('SIGNER'),
  firstName: nameField,
  lastName: nameField,
  email: emailField,
  // Solo tiene efecto real cuando el documento es ADVANCED — para SIMPLE el formulario lo
  // fuerza a true y oculta el control (ver CollaboratorFormItem).
  requiresTwoFactorAuth: z.boolean(),
  // Ubicaciones de firma colocadas por arrastre sobre el PDF (ver historia "Ubicación de
  // firmas por usuario") — un arreglo vacío es válido: el firmante firma sin estampado visual.
  // Sin `.default()` a propósito: con `.default()` el input/output del schema divergen
  // (input optativo, output requerido), lo que rompe la inferencia de tipos de zodResolver
  // contra `CreateDocumentSignaturesFormValues`. Todo lugar que arma un SignerFormValues
  // (`emptySigner`, `buildSelfSigner`) ya manda `signatures` explícito.
  signatures: z.array(signaturePositionSchema),
});

/** El RFC sobrevive solo acá: un espectador no firma, así que no hay certificado del que leerlo. */
export const viewerSchema = z.object({
  collaboratorType: z.literal('VIEWER'),
  firstName: nameField,
  lastName: nameField,
  email: emailField,
  rfc: rfcField,
});

/** Firmantes y espectadores viven en un solo arreglo, diferenciados por `collaboratorType`. */
export const collaboratorSchema = z.discriminatedUnion('collaboratorType', [
  signerSchema,
  viewerSchema,
]);

export type SignerFormValues = z.infer<typeof signerSchema>;
export type ViewerFormValues = z.infer<typeof viewerSchema>;
export type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

export function emptySigner(): SignerFormValues {
  return {
    collaboratorType: 'SIGNER',
    firstName: '',
    lastName: '',
    email: '',
    requiresTwoFactorAuth: true,
    signatures: [],
  };
}

export function emptyViewer(): ViewerFormValues {
  return {
    collaboratorType: 'VIEWER',
    firstName: '',
    lastName: '',
    email: '',
    rfc: '',
  };
}

/** Único criterio de "cuántos firmantes hay" — lo consultan las reglas de sección y la UI. */
export function countSigners(collaborators: CollaboratorFormValues[]): number {
  return collaborators.filter(
    (collaborator) => collaborator.collaboratorType === 'SIGNER',
  ).length;
}
