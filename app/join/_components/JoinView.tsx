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

interface JoinViewProps {
  token: string | null;
  orgId: string | null;
}

export default function JoinView({ token, orgId }: JoinViewProps) {
  const router = useRouter();
  const [rfc, setRfc] = useState<string | null>(null);
  const [rfcExists, setRfcExists] = useState<boolean | null>(null);

  const { data: invitation, isLoading, isError } = useInvitationPreview(token);
  const checkRfcMutation = useCheckRfc();
  const acceptInvitationMutation = useAcceptInvitation();

  if (!token || !orgId) {
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

  function handleRfcSubmit(enteredRfc: string) {
    if (!token || !orgId) return;

    setRfc(enteredRfc);
    checkRfcMutation.mutate(enteredRfc, {
      onSuccess: (exists) => {
        if (exists) {
          setRfcExists(true);
        } else {
          router.push(
            `/signup?rfc=${encodeURIComponent(enteredRfc)}&token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(orgId)}`,
          );
        }
      },
    });
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
              (account) => account.organizationId === orgId,
            );
            if (joinedAccount) {
              const { setAccountsList, setActiveAccount } =
                useAuthStore.getState();
              setAccountsList(accounts);
              setActiveAccount(toAccountListEntry(joinedAccount));
            }
            router.push('/dashboard/home');
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
        {!rfcExists ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ingresa tu RFC para continuar.
            </p>
            <RfcForm
              onSubmit={handleRfcSubmit}
              submitting={checkRfcMutation.isPending}
            />
          </div>
        ) : (
          <JoinExistingUser
            organizationName={invitation.organizationName}
            onConfirm={handleConfirmJoin}
            onCancel={() => setRfcExists(null)}
            confirming={acceptInvitationMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
