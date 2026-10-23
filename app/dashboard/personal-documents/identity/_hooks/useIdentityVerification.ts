'use client';

import { useQuery } from '@tanstack/react-query';
import {
  IN_FLIGHT_SIGNING_CREDENTIAL_STATUSES,
  SigningCredentialStatus,
} from '@/lib/enums/identity';
import {
  getCurrentIdentityVerificationRequest,
  type CurrentIdentityVerification,
} from '../_requests';

export const IDENTITY_VERIFICATION_QUERY_KEY = ['identityVerification'];

/**
 * Cada cuánto se vuelve a preguntar por el estado mientras hay una verificación en vuelo.
 *
 * El resultado de Didit no llega al navegador: llega al backend por webhook. Sin este sondeo,
 * el usuario terminaría su verificación en el celular y se quedaría mirando el QR en la
 * computadora hasta recargar a mano.
 */
const IN_FLIGHT_POLL_INTERVAL_MS = 5_000;

/**
 * Cada cuánto sondear, según el estado que ya se conoce.
 *
 * Sólo se sondea mientras el estado puede cambiar solo. En un estado terminal —aprobado,
 * bloqueado, o esperando que el usuario actúe— seguir preguntando sería tráfico inútil, así que
 * devuelve `false` y react-query detiene el intervalo.
 */
export function identityPollInterval(
  data: CurrentIdentityVerification | undefined,
): number | false {
  if (
    data !== undefined &&
    IN_FLIGHT_SIGNING_CREDENTIAL_STATUSES.includes(data.signingCredentialStatus)
  ) {
    return IN_FLIGHT_POLL_INTERVAL_MS;
  }

  return false;
}

export function useIdentityVerification() {
  return useQuery({
    queryKey: IDENTITY_VERIFICATION_QUERY_KEY,
    queryFn: getCurrentIdentityVerificationRequest,
    refetchInterval: (query) => identityPollInterval(query.state.data),
    /**
     * El caso más común del flujo: el usuario se va a Didit (otra pestaña o el celular) y
     * vuelve. Al recuperar el foco se refresca de inmediato, sin esperar al siguiente sondeo.
     */
    refetchOnWindowFocus: true,
  });
}

/** `true` cuando la credencial quedó lista para firmar. */
export function isSigningCredentialConfigured(
  data: CurrentIdentityVerification | undefined,
): boolean {
  return data?.signingCredentialStatus === SigningCredentialStatus.Configured;
}
