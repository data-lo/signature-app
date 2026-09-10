import apiClient from '@/lib/axios';

/**
 * Estado del perfil de facturación, tal como lo guarda el backend en `billing_profiles`.
 *
 * `FREE` es el plan gratuito con el que nace toda cuenta: se administra sólo en nuestra base de
 * datos y no tiene nada en Stripe. No habilita lo que se paga, pero tampoco es un plan caducado
 * — la pantalla tiene que distinguirlo de `CANCELED`.
 */
export type BillingProfileStatus =
  | 'FREE'
  | 'INCOMPLETE'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED';

/** Por dónde entró el dinero del último periodo cobrado. Espejo de `BILLING_SOURCE_ENUM`. */
export type BillingSource = 'STRIPE' | 'MANUAL';

/**
 * Lo que el plan de la cuenta activa habilita.
 *
 * **Son la ÚNICA forma de decidir qué se dibuja.** Ninguna pantalla debe preguntar por el nombre
 * del plan (`planType === 'premium'`) para habilitar u ocultar algo: esa condición se rompe con
 * cada plan nuevo, se desincroniza de la tabla comercial y obliga a desplegar esta app cada vez
 * que ventas cambia un beneficio. Acá el backend ya respondió la pregunta.
 *
 * **No son un permiso.** El backend vuelve a validar cada acción protegida cuando se ejecuta, así
 * que un `true` que llegara mal no autoriza nada: sólo dibujaría un botón que responde 403.
 *
 * Espejo de `PLAN_ACTION_ENUM` en signature-server.
 */
export interface PlanActions {
  signSimpleAndAdvanced: boolean;
  signInOrder: boolean;
  unlimitedSigners: boolean;
  requestWitnesses: boolean;
  intelligentSearch: boolean;
  /** El plan la contempla; cada firma con biometría se valida además contra sus créditos. */
  graphSignatureBiometrics: boolean;
  bulkSigning: boolean;
  organizationAccount: boolean;
  preApproval: boolean;
  mixSignatureTypes: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  apiIntegration: boolean;
  caseFileGrouping: boolean;
  buyDocumentCredits: boolean;
}

/** Nombre de una acción del plan, para los componentes que reciben cuál comprobar. */
export type PlanAction = keyof PlanActions;

/**
 * Topes numéricos del plan.
 *
 * `null` significa **"no lo fija el plan"**: o se negocia por contrato (`enterprise`,
 * `partners`) o no tiene techo. En los dos casos se dibuja igual —sin límite en esta pantalla—
 * y no se puede sustituir por un número inventado. `0` es distinto y sí es una respuesta: el
 * plan lo prohíbe.
 */
export interface PlanLimits {
  documentsIncludedPerPeriod: number | null;
  maxOrganizationMembers: number | null;
}

/**
 * Estado comercial de la cuenta activa: suscripción, saldo, beneficios y límites.
 *
 * Espejo de `BillingAccessResponse` en signature-server. **Es la fuente única**: sustituye a
 * `SubscriptionState` (`GET /payments/subscription`), que describía el mismo perfil con menos
 * campos y obligaba a decidir qué habilitar a partir del NOMBRE del plan.
 *
 * Las fechas llegan como cadena ISO —lo que viaja en el JSON— y no como `Date`: convertirlas acá
 * escondería que son texto y dejaría a cada pantalla adivinando qué recibe.
 */
export interface BillingAccess {
  /** `null` mientras la cuenta no haya pasado nunca por facturación. */
  billingProfileId: string | null;
  /** Única pregunta que decide si el servicio de pago está habilitado: el perfil está `ACTIVE`. */
  hasActiveSubscription: boolean;
  /**
   * Plan del catálogo (`free`, `plus`, `premium`, `enterprise`, `partners`, ...). Es un conjunto
   * abierto que define el backend, no un enum del frontend: un plan nuevo no debe obligar a
   * desplegar esta app.
   *
   * **Sirve para NOMBRAR el plan, no para decidir.** Sobrevive a la baja —un perfil cancelado
   * conserva el último plan contratado— y no dice qué habilita: eso es `actions`.
   */
  currentPlanType: string | null;
  status: BillingProfileStatus | null;
  /** `null` en una cuenta que nunca fue cobrada, que es el caso de toda cuenta gratuita. */
  billingSource: BillingSource | null;
  /**
   * La baja está programada para el final del periodo vigente.
   *
   * Convive con `hasActiveSubscription: true` a propósito, y por eso son dos campos y no uno: la
   * suscripción sigue habilitando todo hasta `currentPeriodEnd` y lo único que cambia es que no
   * se renovará. Colapsarlos dejaría a la pantalla sin poder distinguir "activa y se renueva" de
   * "activa pero termina el día X", que es lo que el usuario necesita saber.
   */
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  /** Documentos que la cuenta puede consumir HOY, sumando todos sus lotes vigentes. */
  creditsAvailable: number;
  actions: PlanActions;
  limits: PlanLimits;
}

/**
 * El plan con el que nace toda cuenta, personal u organización.
 *
 * Se administra ENTERAMENTE en nuestra base de datos: no tiene producto ni precio en Stripe, no
 * aparece en el catálogo de `/payments/services` y no se contrata por Checkout.
 *
 * **Sólo para rotular, nunca para decidir qué se habilita** — para eso está `actions`. Se
 * reconoce por su valor porque el contrato no lo distingue de otro modo: `currentPlanType` es
 * una cadena abierta y `hasActiveSubscription` es false tanto para el plan gratuito como para uno
 * de pago que caducó, que son dos situaciones opuestas de cara al usuario.
 *
 * Espejo de `FREE_PLAN_TYPE` en signature-server.
 */
export const FREE_PLAN_TYPE = 'free';

/**
 * La cuenta consultada NO viaja como parámetro: el interceptor de `apiClient` manda la cuenta
 * activa del store en `X-Account-Id`, igual que en el resto de la aplicación. Por eso quien
 * llame a esto debe incluir el id de la cuenta en su `queryKey` — si no, el caché serviría el
 * estado de la cuenta anterior después de cambiar de cuenta.
 */
export async function getBillingAccessRequest(): Promise<BillingAccess> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: BillingAccess;
  }>('/api/v1/payments/billing-state');

  return data.data;
}
