import { z } from 'zod';

/**
 * Esquema de la sección "Configuración del documento" (`DocumentConfigurationSection`): las tres
 * opciones que modifican cómo se envía el documento a firma. Todas son booleanas sin validación
 * propia — sus restricciones reales son contextuales y se resuelven donde se conoce el contexto:
 *  - `requiresApproval` solo aplica a cuentas ORGANIZATION (ver `RequiresApprovalField`).
 *  - `requiresOrder` solo aplica con más de 2 firmantes (ver `RequiresOrderField`).
 *  - `includeMeAsSigner` participa de la regla cruzada del esquema compuesto.
 */
export const documentConfigurationSchema = z.object({
  requiresApproval: z.boolean(),
  includeMeAsSigner: z.boolean(),
  requiresOrder: z.boolean(),
});

export type DocumentConfigurationFormValues = z.infer<
  typeof documentConfigurationSchema
>;
