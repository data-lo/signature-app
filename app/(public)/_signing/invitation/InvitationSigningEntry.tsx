'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import SigningSessionStatusView from '../SigningSessionStatusView';
import { invitationStatusOf } from '../signing-session';
import AccountSigningLogin from './AccountSigningLogin';
import InvitationCodeStep from './InvitationCodeStep';
import SigningSessionScreen from './SigningSessionScreen';
import {
  openInvitationRequest,
  openLaunchRequest,
  type InvitationContext,
} from './invitation-requests';

/** De dónde viene el firmante: lo único que cambia entre el correo y el portal del tercero. */
export type InvitationSource =
  | { kind: 'EMAIL'; token: string }
  | { kind: 'THIRD_PARTY_PORTAL'; token: string };

interface InvitationSigningEntryProps {
  source: InvitationSource;
}

/**
 * Entrada de la firma por invitación individual, igual para `/sign/:token` (correo) y
 * `/sign/launch/:token` (portal del tercero):
 *
 * 1. **Canje del token** — el único paso distinto: el del correo vive días; el del portal, minutos
 *    y un solo uso. El backend resuelve la invitación y deja la cookie de acceso.
 * 2. **Estado** — invitación inválida, vencida, revocada, ya firmada, documento cancelado, todavía
 *    no es su turno, o se firma desde la cuenta: estado controlado, sin PDF ni datos. Si se firma
 *    desde una cuenta activa, el backend manda el documento y se ofrece iniciar sesión
 *    (`AccountSigningLogin`) para volver a él ya autenticado.
 * 3. **Código al correo de la invitación** (`InvitationCodeStep`), antes de ver el documento.
 * 4. **Sesión pública** (`SigningSessionScreen`): la misma para los dos orígenes.
 *
 * El correo nunca se pide ni se edita: sale de la invitación, enmascarado.
 *
 * @param props.source - Origen y token de la ruta.
 * @returns El paso en el que va el firmante.
 *
 * @example
 * ```tsx
 * <InvitationSigningEntry source={{ kind: 'THIRD_PARTY_PORTAL', token: 'sla_…' }} />
 * ```
 */
export default function InvitationSigningEntry({
  source,
}: InvitationSigningEntryProps) {
  const [verified, setVerified] = useState(false);

  // El canje del portal consume el token: se hace una sola vez por montaje y nunca se reintenta
  // ni se refresca solo (una recarga de la página ya no puede volver a usarlo).
  const openQuery = useQuery<InvitationContext>({
    queryKey: ['openSigningInvitation', source.kind, source.token],
    queryFn: () =>
      source.kind === 'EMAIL'
        ? openInvitationRequest(source.token)
        : openLaunchRequest(source.token),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const status = useMemo(() => {
    if (openQuery.data) return invitationStatusOf(openQuery.data);
    if (openQuery.isError) {
      const code = isAxiosError(openQuery.error)
        ? openQuery.error.response?.status
        : undefined;
      return code === 400 || code === 404 ? 'INVALID' : 'ERROR';
    }
    return 'LOADING';
  }, [openQuery.data, openQuery.error, openQuery.isError]);

  if (verified) return <SigningSessionScreen />;

  const accountDocumentId = openQuery.data?.document?.id;
  if (status === 'ACCOUNT_REQUIRED' && accountDocumentId) {
    return <AccountSigningLogin documentId={accountDocumentId} />;
  }

  if (status !== 'ACTIVE') {
    return (
      <SigningSessionStatusView
        kind={status}
        // Un token del portal ya canjeado no se puede reintentar; el del correo sí.
        onRetry={
          source.kind === 'EMAIL' ? () => void openQuery.refetch() : undefined
        }
      />
    );
  }

  const context = openQuery.data!;
  return (
    <InvitationCodeStep
      documentName={context.document?.name}
      maskedEmail={context.signer!.maskedEmail}
      onVerified={() => setVerified(true)}
    />
  );
}
