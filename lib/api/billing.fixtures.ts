import type { BillingAccess, PlanActions, PlanLimits } from './billing';

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
  creditsAvailable: 0,
  actions: ACCIONES_FREE,
  limits: LIMITES_FREE,
};

/**
 * `actions` y `limits` se aceptan a medias —y se fusionan sobre los del plan gratuito— porque una
 * prueba casi siempre habla de UN beneficio: escribir las quince banderas para decir "éste tiene
 * branding" enterraría lo que la prueba quiere afirmar.
 */
export function buildBillingAccess(
  overrides: Partial<Omit<BillingAccess, 'actions' | 'limits'>> & {
    actions?: Partial<PlanActions>;
    limits?: Partial<PlanLimits>;
  } = {},
): BillingAccess {
  return {
    ...SIN_PERFIL,
    billingProfileId: 'perfil-1',
    hasActiveSubscription: true,
    currentPlanType: 'plus',
    status: 'ACTIVE',
    billingSource: 'STRIPE',
    creditsAvailable: 18,
    ...overrides,
    actions: { ...ACCIONES_FREE, ...overrides.actions },
    limits: { ...LIMITES_FREE, ...overrides.limits },
  };
}
