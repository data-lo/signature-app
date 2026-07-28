import { z } from 'zod';

/** Posición de firma por defecto — sin UI para esto todavía (ver historia), el frontend la inyecta siempre igual. */
export const DEFAULT_SIGNATURE_POSITION = { page: 1, x: 100, y: 100 } as const;

const nameField = z.string().trim().min(1, { message: 'Requerido' });
const emailField = z
  .string()
  .trim()
  .min(1, { message: 'Requerido' })
  .email({ message: 'Correo inválido' });
const rfcField = z.string().trim().min(1, { message: 'El RFC es obligatorio' });

const signerSchema = z
  .object({
    collaboratorType: z.literal('SIGNER'),
    firstName: nameField,
    lastName: nameField,
    email: emailField,
    signatureType: z.enum(['SIMPLE', 'ADVANCED'], {
      message: 'Selecciona el tipo de firma',
    }),
    rfc: z.string().trim().nullable().optional(),
    // Solo tiene efecto real cuando signatureType es ADVANCED — para SIMPLE el formulario lo
    // fuerza a true y oculta el control (ver CollaboratorFormItem).
    requiresTwoFactorAuth: z.boolean(),
  })
  .refine(
    (value) =>
      value.signatureType !== 'ADVANCED' || Boolean(value.rfc?.trim()),
    {
      message: 'El RFC es obligatorio para firma avanzada (FIEL)',
      path: ['rfc'],
    },
  );

const viewerSchema = z.object({
  collaboratorType: z.literal('VIEWER'),
  firstName: nameField,
  lastName: nameField,
  email: emailField,
  rfc: rfcField,
});

export const collaboratorSchema = z.discriminatedUnion('collaboratorType', [
  signerSchema,
  viewerSchema,
]);

export type SignerFormValues = z.infer<typeof signerSchema>;
export type ViewerFormValues = z.infer<typeof viewerSchema>;
export type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

export const createDocumentSignaturesSchema = z
  .object({
    requiresApproval: z.boolean(),
    includeMeAsSigner: z.boolean(),
    // Historia "Habilitar ordenamiento Drag and Drop para firmantes requeridos": solo tiene
    // efecto real con más de 2 firmantes (ver RequiresOrderField).
    requiresOrder: z.boolean(),
    collaborators: z.array(collaboratorSchema),
  })
  .superRefine((values, ctx) => {
    const hasManualSigner = values.collaborators.some(
      (c) => c.collaboratorType === 'SIGNER',
    );
    // "Incluirme como firmante" cuenta como firmante aunque el arreglo manual esté vacío o
    // solo tenga espectadores — el firmante "yo" se agrega en el submit, no en este arreglo.
    if (!hasManualSigner && !values.includeMeAsSigner) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Agrega al menos un firmante, o marca "Incluirme como firmante"',
        path: ['collaborators'],
      });
    }
  });

export type CreateDocumentSignaturesFormValues = z.infer<
  typeof createDocumentSignaturesSchema
>;

export function emptySigner(): SignerFormValues {
  return {
    collaboratorType: 'SIGNER',
    firstName: '',
    lastName: '',
    email: '',
    signatureType: 'SIMPLE',
    rfc: null,
    requiresTwoFactorAuth: true,
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

/** Escenario 3 de la historia: SIMPLE/FIEL si todos los firmantes coinciden, MIX si hay combinación. */
export function computeRequiresDifferentSignatures(
  collaborators: CollaboratorFormValues[],
): 'SIMPLE' | 'FIEL' | 'MIX' {
  const signerTypes = new Set(
    collaborators
      .filter((c): c is SignerFormValues => c.collaboratorType === 'SIGNER')
      .map((c) => c.signatureType),
  );

  if (signerTypes.size <= 1) {
    const onlyType = [...signerTypes][0];
    return onlyType === 'ADVANCED' ? 'FIEL' : 'SIMPLE';
  }
  return 'MIX';
}

/** Forma exacta que espera el backend (POST /api/v1/documents/signatures). */
export interface BackendCollaboratorPayload {
  collaboratorType: 'SIGNER' | 'VIEWER';
  firstName: string;
  lastName: string;
  email: string;
  rfc?: string | null;
  signatureType?: 'SIMPLE' | 'ADVANCED';
  signaturePosition?: { page: number; x: number; y: number };
  requiresTwoFactorAuth?: boolean;
  /**
   * Posición final tras el reordenamiento manual (ver historia "Habilitar ordenamiento Drag and
   * Drop para firmantes requeridos") — refleja el índice del colaborador dentro del arreglo ya
   * reordenado (0-based); DocumentSignaturesService lo usa para calcular signingOrder.
   */
  orderIndex: number;
}

/**
 * Traduce el formulario al payload del backend. Refuerza acá (no solo en el schema de Zod) la
 * regla de la historia: SIMPLE siempre manda requiresTwoFactorAuth=true "oculto", sin importar
 * qué haya quedado en el estado del form — el checkbox de 2FA ni siquiera se renderiza para
 * SIMPLE (ver CollaboratorFormItem), así que esto es la única fuente de verdad para ese caso.
 */
export function toBackendCollaboratorPayload(
  collaborator: CollaboratorFormValues,
  orderIndex = 0,
): BackendCollaboratorPayload {
  if (collaborator.collaboratorType === 'VIEWER') {
    return {
      collaboratorType: 'VIEWER',
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email,
      rfc: collaborator.rfc,
      orderIndex,
    };
  }

  return {
    collaboratorType: 'SIGNER',
    firstName: collaborator.firstName,
    lastName: collaborator.lastName,
    email: collaborator.email,
    rfc: collaborator.signatureType === 'ADVANCED' ? collaborator.rfc : null,
    signatureType: collaborator.signatureType,
    signaturePosition: DEFAULT_SIGNATURE_POSITION,
    requiresTwoFactorAuth:
      collaborator.signatureType === 'SIMPLE'
        ? true
        : collaborator.requiresTwoFactorAuth,
    orderIndex,
  };
}
