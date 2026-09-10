'use client';

import { useCanPerform } from '@/lib/hooks/useBillingAccess';

/**
 * Lo que se le dice a quien no puede crear una organización.
 *
 * Es la copia exacta que redactó producto y la misma que responde el backend al rechazar la
 * petición (`ORGANIZATION_ACCOUNT_DENIED_MESSAGE` en signature-server, que además explica qué
 * hacer). Vive acá porque la comparten los dos controles que ofrecen la acción —la opción del
 * selector de cuentas y el botón del formulario—: escribirla en cada uno haría que cambiarla en
 * uno solo pasara desapercibido.
 */
export const ORGANIZATION_ACCOUNT_TOOLTIP = 'No disponible en plan Free';

/**
 * ¿El plan de la cuenta activa incluye la cuenta empresarial?
 *
 * @remarks
 * Pregunta por el BENEFICIO (`actions.organizationAccount`) y no por el nombre del plan. La
 * diferencia importa: `currentPlanType !== 'free'` es la comprobación que la historia daba como
 * apaño temporal, y hoy no hace falta porque la tabla comercial ya está integrada de punta a
 * punta —el backend la resuelve en `plan-entitlements.config.ts` y la manda en `actions`—. Con el
 * nombre del plan, mover el beneficio (venderlo en un plan nuevo, quitárselo a otro) obligaría a
 * desplegar esta app; con el beneficio, no.
 *
 * Sigue la cuenta ACTIVA sin ningún efecto explícito: el estado comercial está indexado por
 * cuenta en el store y la consulta lo lleva en su `queryKey`, así que cambiar de cuenta —o
 * refrescar el plan tras contratar— recalcula esto y redibuja el control.
 *
 * Devuelve `false` mientras el estado de facturación no haya llegado, que es el criterio de
 * `useCanPerform`: ante la duda no se ofrece una acción que el backend va a rechazar. En la
 * práctica ya está cargado —`AuthProvider` monta la consulta al iniciar sesión—, y de todos
 * modos el bloqueo es sólo experiencia de usuario: quien de verdad autoriza es el endpoint.
 *
 * @returns `true` si el plan de la cuenta activa permite crear organizaciones.
 *
 * @example
 * ```tsx
 * const canCreateOrganization = useCanCreateOrganization();
 *
 * <Tooltip>
 *   <TooltipTrigger render={<Button aria-disabled={!canCreateOrganization} />} />
 *   <TooltipContent>{ORGANIZATION_ACCOUNT_TOOLTIP}</TooltipContent>
 * </Tooltip>;
 * ```
 */
export function useCanCreateOrganization(): boolean {
  return useCanPerform('organizationAccount');
}
