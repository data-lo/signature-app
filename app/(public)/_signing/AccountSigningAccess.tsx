'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthToken } from '@/lib/cookies';
import {
  publicSigningPath,
  setPublicSigningContext,
} from '@/lib/public-signing-context';
import type { SigningSession } from './signing-session';

export const PROVISIONED_ACCOUNT_MESSAGE =
  'Tu cuenta todavía no está activada, así que aún no puedes firmar con ella. Te avisaremos por correo cuando puedas completar tu alta.';

interface AccountSigningAccessProps {
  session: SigningSession;
  /** Explica qué se hace desde la cuenta; cada flujo pone el suyo. */
  description: string;
}

/**
 * Continuación desde la cuenta del firmante, para los casos en que la firma no se completa sin ella
 * (firma simple, o un firmante con cuenta vinculada). No crea un flujo nuevo: reutiliza el de
 * `/public/documents/:id/sign` —guarda el contexto de la invitación, y tras el login esa pantalla
 * vincula la cuenta y abre el documento en el panel, donde están la verificación de correo, la de
 * identidad y la firma—.
 *
 * Un usuario `PROVISIONED` (creado por una integración) no puede iniciar sesión todavía: se
 * muestra el estado en vez de mandarlo a un login que lo rechazaría.
 *
 * @param props.session - Sesión activa.
 * @param props.description - Texto del flujo.
 * @returns La tarjeta con el siguiente paso.
 *
 * @example
 * ```tsx
 * <AccountSigningAccess session={session} description="La firma simple se completa desde tu cuenta." />
 * ```
 */
export default function AccountSigningAccess({
  session,
  description,
}: AccountSigningAccessProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const { document, signer } = session;

  if (signer.accountStatus === 'PROVISIONED') {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Cuenta pendiente de activar</CardTitle>
        </CardHeader>
        <CardContent>
          <p role="status" className="text-sm text-muted-foreground">
            {PROVISIONED_ACCOUNT_MESSAGE}
          </p>
        </CardContent>
      </Card>
    );
  }

  const collaboratorId = signer.collaboratorId;
  const hasSession = Boolean(getAuthToken());

  function continueWithAccount() {
    if (!collaboratorId) return;
    setPublicSigningContext(document.id, collaboratorId);
    setRedirecting(true);
    // Con sesión, la pantalla actual vincula la cuenta (o avisa si no corresponde); sin ella, el
    // login vuelve a esa pantalla con el contexto guardado.
    router.push(hasSession ? publicSigningPath(document.id) : '/login');
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Firma desde tu cuenta</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          disabled={!collaboratorId || redirecting}
          onClick={continueWithAccount}
        >
          {redirecting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="size-4" aria-hidden />
          )}
          {hasSession ? 'Continuar con mi cuenta' : 'Iniciar sesión'}
        </Button>
      </CardContent>
    </Card>
  );
}
