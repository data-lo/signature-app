'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthToken } from '@/lib/cookies';
import { getAccountsCatalogRequest } from '@/lib/api/accounts';
import { toAccountListEntry } from '@/lib/store/accounts-list.slice';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useInvitationPreview } from '../_hooks/useInvitationPreview';
import { useCheckRfc } from '../_hooks/useCheckRfc';
import { useAcceptInvitation } from '../_hooks/useAcceptInvitation';
import RfcForm from './RfcForm';
import JoinExistingUser from './JoinExistingUser';
import JoinNewUser from './JoinNewUser';

interface JoinViewProps {
  token: string | null;
}

/**
 * Pantalla del enlace de invitación (`/join?token=...`).
 *
 * El token es lo único que viaja en el enlace. La organización sale de la propia invitación, que
 * se consulta con él: llevarla también en la URL daba dos fuentes de la misma verdad, y un enlace
 * editado a mano podía apuntar a otra organización. Los enlaces viejos que todavía traen
 * `orgId` siguen funcionando: el parámetro simplemente se ignora.
 *
 * La persona se identifica con su RFC, no con el correo al que llegó la invitación, porque puede
 * tener su cuenta registrada con otro correo. Según exista o no una cuenta con ese RFC, se
 * ofrece unirse (`JoinExistingUser`) o crear la cuenta (`JoinNewUser`).
 */
export default function JoinView({ token }: JoinViewProps) {
  const router = useRouter();
  const [rfc, setRfc] = useState<string | null>(null);
  /** `null` mientras no se ha consultado un RFC; luego, si ese RFC tiene cuenta. */
  const [rfcExists, setRfcExists] = useState<boolean | null>(null);

  const { data: invitation, isLoading, isError } = useInvitationPreview(token);
  const checkRfcMutation = useCheckRfc();
  const acceptInvitationMutation = useAcceptInvitation();

  if (!token) {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Enlace inválido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este enlace de invitación no es válido. Verifica que copiaste la
            URL completa desde tu correo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Cargando invitación...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !invitation) {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Invitación no encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No encontramos esta invitación. Puede que ya no exista o que la
            URL esté incompleta.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (invitation.status === 'EXPIRED') {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Invitación expirada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta invitación a <strong>{invitation.organizationName}</strong>{' '}
            ya expiró. Pide al administrador que te envíe una nueva.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Invitación ya utilizada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta invitación a <strong>{invitation.organizationName}</strong>{' '}
            ya fue utilizada. Si ya tienes acceso, inicia sesión normalmente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const organizationId = invitation.organizationId;

  /**
   * Consulta si el RFC tiene cuenta y muestra la pantalla que corresponde. Ya no redirige al
   * registro por su cuenta: un RFC mal tecleado mandaba a crear una cuenta duplicada sin que la
   * persona pudiera darse cuenta. Ahora ve el RFC consultado y decide.
   *
   * @param enteredRfc - RFC capturado en el formulario.
   */
  function handleRfcSubmit(enteredRfc: string) {
    setRfc(enteredRfc);
    checkRfcMutation.mutate(enteredRfc, {
      onSuccess: (exists) => setRfcExists(exists),
    });
  }

  /**
   * Lleva al registro conservando el RFC y el token. El registro crea la cuenta por el flujo
   * normal y, sólo si responde bien, acepta la invitación con ese mismo RFC (ver `useRegister`).
   */
  function handleCreateAccount() {
    if (!rfc || !token) return;

    router.push(
      `/signup?rfc=${encodeURIComponent(rfc)}&token=${encodeURIComponent(token)}`,
    );
  }

  /** Vuelve al formulario de RFC, descartando el que se consultó. */
  function handleUseAnotherRfc() {
    setRfc(null);
    setRfcExists(null);
  }

  async function handleConfirmJoin() {
    if (!rfc || !token) return;

    acceptInvitationMutation.mutate(
      { token, rfc },
      {
        onSuccess: async () => {
          const activeSessionToken = getAuthToken();

          if (activeSessionToken) {
            const accounts = await getAccountsCatalogRequest();
            const joinedAccount = accounts.find(
              (account) => account.organizationId === organizationId,
            );
            if (joinedAccount) {
              const { setAccountsList, setActiveAccount } =
                useAuthStore.getState();
              setAccountsList(accounts);
              setActiveAccount(toAccountListEntry(joinedAccount));
            }
            router.push('/dashboard/documents/create');
          } else {
            router.push('/login');
          }
        },
      },
    );
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>
          Has sido invitado a {invitation.organizationName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rfcExists === true && rfc ? (
          <JoinExistingUser
            organizationName={invitation.organizationName}
            onConfirm={handleConfirmJoin}
            onCancel={handleUseAnotherRfc}
            confirming={acceptInvitationMutation.isPending}
          />
        ) : rfcExists === false && rfc ? (
          <JoinNewUser
            rfc={rfc}
            onCreateAccount={handleCreateAccount}
            onUseAnotherRfc={handleUseAnotherRfc}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ingresa tu RFC para continuar.
            </p>
            <RfcForm
              onSubmit={handleRfcSubmit}
              submitting={checkRfcMutation.isPending}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
