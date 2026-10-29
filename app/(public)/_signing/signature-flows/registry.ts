import type { ComponentType } from 'react';
import type { SignatureFlowType } from '../signing-session';
import AdvancedSignatureFlow from './AdvancedSignatureFlow';
import BiometricSignatureFlow from './BiometricSignatureFlow';
import SimpleSignatureFlow from './SimpleSignatureFlow';
import type { SignatureFlowProps } from './types';

/** Registro de flujos por tipo de firma. */
export type SignatureFlowRegistry = Readonly<
  Partial<Record<string, ComponentType<SignatureFlowProps>>>
>;

/**
 * Registro de estrategias: un flujo por tipo de firma. Agregar un tipo es agregar una entrada aquí;
 * ningún otro componente decide por tipo.
 */
export const signatureFlows: Readonly<
  Record<SignatureFlowType, ComponentType<SignatureFlowProps>>
> = {
  SIMPLE: SimpleSignatureFlow,
  ADVANCED: AdvancedSignatureFlow,
  BIOMETRIC: BiometricSignatureFlow,
};

/**
 * Flujo registrado para un tipo de firma. Nunca devuelve uno por defecto.
 *
 * @param type - Tipo de la sesión (o cualquier valor que haya llegado).
 * @param registry - Registro a consultar; por omisión, `signatureFlows`.
 * @returns El componente del flujo, o `null` si el tipo no está registrado.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * resolveSignatureFlow('ADVANCED'); // AdvancedSignatureFlow
 * resolveSignatureFlow('toString'); // null
 * ```
 */
export function resolveSignatureFlow(
  type: string | null | undefined,
  registry: SignatureFlowRegistry = signatureFlows,
): ComponentType<SignatureFlowProps> | null {
  if (!type || !Object.hasOwn(registry, type)) return null;
  return registry[type] ?? null;
}
