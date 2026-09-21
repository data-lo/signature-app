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
 * Lo que se muestra cuando el documento requiere aprobación pero todavía no se ha elegido a
 * quién se le pide.
 */
export const APPROVER_REQUIRED_MESSAGE =
  'Selecciona el usuario que aprobará el documento';

/**
 * Esquema de la sección "Configuración del documento" (`DocumentConfigurationSection`): el tipo de
 * firma exigido y las tres opciones que modifican cómo se envía el documento a firma. Las
 * booleanas no tienen validación propia — sus restricciones reales son contextuales y se resuelven
 * donde se conoce el contexto:
 *  - `requiresApproval` solo aplica a cuentas ORGANIZATION (ver `RequiresApprovalField`).
 *  - `requiresOrder` solo se puede ordenar visualmente con dos o más firmantes.
 *  - `includeMeAsSigner` participa de la regla cruzada del esquema compuesto.
 *
 * La única excepción es `approverUserId`, cuya restricción sí es expresable aquí porque depende
 * de otro campo de esta misma sección y de nada más: exigir un aprobador cuando —y sólo
 * cuando— el documento requiere aprobación (ver el `superRefine` de abajo).
 *
 * `requiresOrder` e `includeMeAsSigner` se **renderizan** en `DocumentParticipantsSection`, no en
 * la sección que da nombre a este esquema. Se quedan acá a propósito: el esquema compuesto aplana
 * ambos objetos (`.extend(shape)`), así que repartir los campos entre uno y otro no cambiaría ni
 * los valores del formulario ni el payload — solo produciría un diff sin efecto. Lo que decide en
 * qué acordeón aparece cada control es dónde se monta su componente.
 */
export const documentConfigurationSchema = z
  .object({
    signatureType: z.enum(DOCUMENT_SIGNATURE_TYPES).nullable(),
    /** Aplica a todos los firmantes cuando el documento usa firma avanzada. */
    requiresTwoFactorAuth: z.boolean(),
    requiresApproval: z.boolean(),
    /**
     * Usuario de la organización que aprobará el documento antes de que salga a firma (ver
     * historia "Selección de aprobador al requerir aprobación en nuevo documento"). `null`
     * mientras no se haya elegido, que es el único valor válido con la aprobación desactivada.
     */
    approverUserId: z.string().nullable(),
    includeMeAsSigner: z.boolean(),
    requiresOrder: z.boolean(),
  })
  .superRefine((values, ctx) => {
    /**
     * Sin aprobador no hay a quién mandarle el documento: la aprobación quedaría marcada y el
     * documento parado. La regla es del formulario y no del selector porque el selector puede
     * no estar en pantalla —la sección está contraída, o la consulta no devolvió a nadie— y aun
     * así el envío tiene que rechazarse.
     */
    if (values.requiresApproval && !values.approverUserId) {
      ctx.addIssue({
        code: 'custom',
        message: APPROVER_REQUIRED_MESSAGE,
        path: ['approverUserId'],
      });
    }
  });

export type DocumentConfigurationFormValues = z.infer<
  typeof documentConfigurationSchema
>;
