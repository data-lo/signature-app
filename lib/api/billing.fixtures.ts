import type {
  BillingAccess,
  BillingCredits,
  PlanActions,
  PlanLimits,
} from './billing';

/**
 * Un `BillingAccess` de mentira para las pruebas, con todo puesto y sólo lo que interesa
 * sobrescrito.
 *
 * Vive junto al contrato y no dentro de un `.spec` porque lo necesitan tres pruebas distintas
 * —el hook, la tarjeta y el aviso de retorno de pago— y copiarlo en cada una tendría el efecto
 * contrario al que se busca: al agregar un campo al contrato, TypeScript sólo señalaría el
 * archivo donde alguien se acordó de actualizarlo, y las demás pruebas seguirían pasando contra
 * una forma que el backend ya no manda.
 */
const ACCIONES_FREE: PlanActions = {
  signSimpleAndAdvanced: true,
  signInOrder: true,
  unlimitedSigners: true,
  requestWitnesses: true,
  intelligentSearch: true,
  graphSignatureBiometrics: true,
  bulkSigning: false,
  organizationAccount: false,
  preApproval: false,
  mixSignatureTypes: false,
  prioritySupport: false,
  customBranding: false,
  apiIntegration: false,
  caseFileGrouping: false,
  buyDocumentCredits: true,
};

const LIMITES_FREE: PlanLimits = {
  documentsIncludedPerPeriod: 0,
  maxOrganizationMembers: 0,
};

/** Lo que responde el backend a una cuenta sin perfil: Free seguro y sin saldo. */
export const SIN_PERFIL: BillingAccess = {
  billingProfileId: null,
  hasActiveSubscription: false,
  currentPlanType: null,
  status: null,
  billingSource: null,
  cancelAtPeriodEnd: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  credits: {
    document: { available: 0 },
    biometric: { available: 0 },
  },
  actions: ACCIONES_FREE,
  limits: LIMITES_FREE,
};

/**
 * Lo que responde el backend a una organización sin plan: sin perfil, sin saldo y sin NINGUNA
 * acción. No es Free: las organizaciones nacen sin plan y tienen que contratarlo para operar.
 */
export const ORGANIZATION_WITHOUT_PLAN: BillingAccess = {
  ...SIN_PERFIL,
  actions: {
    signSimpleAndAdvanced: false,
    signInOrder: false,
    unlimitedSigners: false,
    requestWitnesses: false,
    intelligentSearch: false,
    graphSignatureBiometrics: false,
    bulkSigning: false,
    organizationAccount: false,
    preApproval: false,
    mixSignatureTypes: false,
    prioritySupport: false,
    customBranding: false,
    apiIntegration: false,
    caseFileGrouping: false,
    buyDocumentCredits: false,
  },
  limits: {
    documentsIncludedPerPeriod: null,
    maxOrganizationMembers: null,
  },
};

/**
 * `actions`, `limits` y `credits` se aceptan a medias —y se fusionan sobre los valores por
 * omisión— porque una prueba casi siempre habla de UNA cosa: escribir las quince banderas para
 * decir "éste tiene branding", o los dos saldos para decir "le quedan 3 documentos", enterraría lo
 * que la prueba quiere afirmar. Por omisión: 18 documentos y 0 firmas biométricas.
 */
export function buildBillingAccess(
  overrides: Partial<Omit<BillingAccess, 'actions' | 'limits' | 'credits'>> & {
    actions?: Partial<PlanActions>;
    limits?: Partial<PlanLimits>;
    credits?: Partial<BillingCredits>;
  } = {},
): BillingAccess {
  return {
    ...SIN_PERFIL,
    billingProfileId: 'perfil-1',
    hasActiveSubscription: true,
    currentPlanType: 'plus',
    status: 'ACTIVE',
    billingSource: 'STRIPE',
    ...overrides,
    credits: {
      document: { available: 18 },
      biometric: { available: 0 },
      ...overrides.credits,
    },
    actions: { ...ACCIONES_FREE, ...overrides.actions },
    limits: { ...LIMITES_FREE, ...overrides.limits },
  };
}

/**
 * Atajo para el caso más común en pruebas: sólo los saldos.
 *
 * @param document - Documentos disponibles.
 * @param biometric - Firmas biométricas disponibles; por omisión `0`.
 * @returns Los saldos con la forma del contrato.
 *
 * @example
 * ```ts
 * buildBillingAccess({ credits: creditsOf(12, 8) });
 * ```
 */
export function creditsOf(document: number, biometric = 0): BillingCredits {
  return {
    document: { available: document },
    biometric: { available: biometric },
  };
}
