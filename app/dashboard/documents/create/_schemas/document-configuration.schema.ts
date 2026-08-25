import { z } from 'zod';

/**
 * Los dos únicos flujos de firma que admite un documento (ver historia "Selección de tipo de
 * firma al crear documentos"). Es una decisión del documento completo, no de cada firmante: antes
 * cada SIGNER traía su propio `signatureType` y la combinación producía un tercer flujo mixto
 * (`MIX`) que ningún proceso de firma implementa realmente — con el tipo acá arriba, esa
 * configuración inválida deja de existir por construcción.
 */
export const DOCUMENT_SIGNATURE_TYPES = ['SIMPLE', 'ADVANCED'] as const;

export type DocumentSignatureType = (typeof DOCUMENT_SIGNATURE_TYPES)[number];

/**
 * Esquema de la sección "Configuración del documento" (`DocumentConfigurationSection`): el tipo de
 * firma exigido y las tres opciones que modifican cómo se envía el documento a firma. Las
 * booleanas no tienen validación propia — sus restricciones reales son contextuales y se resuelven
 * donde se conoce el contexto:
 *  - `requiresApproval` solo aplica a cuentas ORGANIZATION (ver `RequiresApprovalField`).
 *  - `requiresOrder` solo se puede ordenar visualmente con dos o más firmantes.
 *  - `includeMeAsSigner` participa de la regla cruzada del esquema compuesto.
 *
 * `requiresOrder` e `includeMeAsSigner` se **renderizan** en `DocumentParticipantsSection`, no en
 * la sección que da nombre a este esquema. Se quedan acá a propósito: el esquema compuesto aplana
 * ambos objetos (`.extend(shape)`), así que repartir los campos entre uno y otro no cambiaría ni
 * los valores del formulario ni el payload — solo produciría un diff sin efecto. Lo que decide en
 * qué acordeón aparece cada control es dónde se monta su componente.
 */
export const documentConfigurationSchema = z.object({
  signatureType: z.enum(DOCUMENT_SIGNATURE_TYPES).nullable(),
  /** Aplica a todos los firmantes cuando el documento usa firma avanzada. */
  requiresTwoFactorAuth: z.boolean(),
  requiresApproval: z.boolean(),
  includeMeAsSigner: z.boolean(),
  requiresOrder: z.boolean(),
});

export type DocumentConfigurationFormValues = z.infer<
  typeof documentConfigurationSchema
>;
