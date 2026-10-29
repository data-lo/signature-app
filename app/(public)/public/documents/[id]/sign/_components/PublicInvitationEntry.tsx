'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/error-alert';
import { getAuthToken } from '@/lib/cookies';
import { useLogout } from '@/lib/hooks/useLogout';
import {
  clearPublicSigningContext,
  getPublicSigningContext,
  linkInvitationRequest,
  setPublicSigningContext,
} from '@/lib/public-signing-context';
import { readStoredGuestAccess } from '../../biometric-signature/_hooks/useGuestAccess';
import { SignatureType } from '@/lib/enums/document';
import { getPublicSigningInvitationRequest } from '../_requests';
import { SigningSessionProvider } from '@/app/(public)/_signing/SigningSessionProvider';
import PublicSigningLayout from '@/app/(public)/_signing/PublicSigningLayout';
import { fromPublicSigningInvitation } from '@/app/(public)/_signing/signing-session';

export const ACCOUNT_MISMATCH_MESSAGE =
  'La cuenta activa no corresponde al correo invitado para este documento.';

interface PublicInvitationEntryProps {
  documentId: string;
  /** `collabId` del enlace del correo, si la URL lo trae. */
  collaboratorId: string | null;
  /** `email` del enlace, si la URL lo trae. Sólo se reenvía a los flujos sin cuenta; nunca autoriza. */
  email: string | null;
}

/** Qué está pasando con la sesión del navegador frente a la invitación. */
type SessionStep =
  | 'detecting'
  | 'none'
  | 'linking'
  | 'linked'
  | 'mismatch'
  | 'unavailable'
  | 'error';

/** Lo que eligió el invitado sin sesión (o tras una cuenta que no corresponde). */
type Choice = 'pending' | 'login' | 'guest';

/**
 * Lee la referencia de la invitación al montar: la de la URL o, de regreso del login (cuya
 * `returnTo` no lleva query), la del contexto temporal de esta pestaña.
 *
 * @param documentId - Documento de la ruta.
 * @param collaboratorId - `collabId` de la URL, si viene.
 * @returns La referencia (id del colaborador), o `null` si no hay ninguna.
 *
 * @example
 * ```ts
 * resolveInvitationReference('doc-1', null); // 'c-1' si el contexto guardado es de doc-1
 * ```
 */
export function resolveInvitationReference(
  documentId: string,
  collaboratorId: string | null,
): string | null {
  if (collaboratorId) return collaboratorId;
  const context = getPublicSigningContext();
  return context?.documentId === documentId
    ? context.invitationReference
    : null;
}

/** Tarjeta simple de la pantalla pública. */
function EntryCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-md">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`flex flex-col gap-4 ${title ? '' : 'pt-6'}`}>
        {children}
      </CardContent>
    </Card>
  );
}

/** Estado de espera con su texto. */
function Pending({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {text}
    </p>
  );
}

/**
 * Decisión inicial del firmante invitado en `/public/documents/:documentId/sign`.
 *
 * 1. Valida la invitación con el backend (nombre del documento, correo enmascarado, tipo de firma,
 *    si sigue disponible y si admite continuar sin cuenta).
 * 2. Revisa si hay sesión:
 *    - **Sin sesión** → "Iniciar sesión" (guarda el contexto temporal y va a `/login`) o
 *      "Continuar sin cuenta" (OTP y el flujo del tipo de firma, sin tocar al colaborador).
 *    - **Con sesión** → pide la vinculación al backend con la referencia de la invitación. Sólo si
 *      el backend la confirma (`LINKED`/`ALREADY_LINKED`) se abre el dashboard; si la cuenta no
 *      corresponde, no se redirige y se ofrece cerrar sesión o continuar sin cuenta.
 *
 * El frontend nunca vincula ni compara correos: decide el backend con el correo verificado de la
 * sesión. Al volver de Didit (sin invitación en la URL ni contexto) retoma la firma biométrica con
 * el acceso de invitado de la pestaña.
 *
 * Es el adaptador de esta ruta al modelo compartido: al continuar sin cuenta convierte la
 * invitación en una `SigningSession` (`fromPublicSigningInvitation`) y la firma sigue en
 * `PublicSigningLayout`, la misma pantalla que usa `/sign/:token`.
 */
export default function PublicInvitationEntry({
  documentId,
  collaboratorId,
  email,
}: PublicInvitationEntryProps) {
  const router = useRouter();
  const logout = useLogout();
  // `undefined` hasta leer la URL y el contexto en el cliente.
  const [reference, setReference] = useState<string | null | undefined>(
    undefined,
  );
  const [resumesBiometric, setResumesBiometric] = useState(false);
  const [sessionStep, setSessionStep] = useState<SessionStep>('detecting');
  const [choice, setChoice] = useState<Choice>('pending');
  const linkStarted = useRef(false);

  useEffect(() => {
    const resolved = resolveInvitationReference(documentId, collaboratorId);
    setReference(resolved);
    if (!resolved) {
      setResumesBiometric(Boolean(readStoredGuestAccess(documentId)));
    }
  }, [documentId, collaboratorId]);

  const invitationQuery = useQuery({
    queryKey: ['publicSigningInvitation', documentId, reference],
    queryFn: () => getPublicSigningInvitationRequest(documentId, reference!),
    enabled: Boolean(reference),
    retry: false,
  });
  const invitation = invitationQuery.data;

  const link = useCallback(async () => {
    if (!reference) return;
    setSessionStep('linking');
    try {
      const result = await linkInvitationRequest(documentId, reference);
      if (result.linked) {
        clearPublicSigningContext();
        setSessionStep('linked');
        router.replace(`/dashboard/documents/${documentId}`);
        return;
      }
      setSessionStep(
        result.outcome === 'NOT_AVAILABLE' ? 'unavailable' : 'mismatch',
      );
    } catch {
      setSessionStep('error');
    }
  }, [documentId, reference, router]);

  /** Con la invitación validada, se detecta la sesión y, si hay, se pide la vinculación una vez. */
  useEffect(() => {
    if (!invitation || !invitation.availableForSigning) return;
    if (!getAuthToken()) {
      setSessionStep('none');
      return;
    }
    if (linkStarted.current) return;
    linkStarted.current = true;
    void link();
  }, [invitation, link]);

  /** Una invitación inválida no deja contexto colgando. */
  const invalidInvitation =
    reference === null ||
    (isAxiosError(invitationQuery.error) &&
      [400, 404].includes(invitationQuery.error.response?.status ?? 0));
  useEffect(() => {
    if (invalidInvitation) clearPublicSigningContext();
  }, [invalidInvitation]);

  function goToLogin() {
    if (!reference) return;
    setPublicSigningContext(documentId, reference);
    setChoice('login');
    router.push('/login');
  }

  function switchAccount() {
    if (!reference) return;
    setPublicSigningContext(documentId, reference);
    setChoice('login');
    logout.mutate();
  }

  function continueAsGuest() {
    clearPublicSigningContext();
    setChoice('guest');
  }

  /** Sesión normalizada para el layout compartido: la del invitado, o la de regreso de Didit. */
  const guestSession = useMemo(() => {
    if (reference === null && resumesBiometric) {
      return fromPublicSigningInvitation(
        documentId,
        null,
        { collaboratorId: null, email: null },
        SignatureType.BIOMETRIC,
      );
    }
    if (choice !== 'guest' || !reference || !invitation) return null;
    return fromPublicSigningInvitation(documentId, invitation, {
      collaboratorId: reference,
      email,
    });
  }, [choice, documentId, email, invitation, reference, resumesBiometric]);

  if (reference === undefined) return null;

  if (reference === null) {
    if (guestSession) {
      return (
        <SigningSessionProvider state={guestSession}>
          <PublicSigningLayout />
        </SigningSessionProvider>
      );
    }
    return (
      <ErrorAlert
        className="mx-auto w-full max-w-md"
        title="Invitación inválida"
        message="Abre esta página desde el enlace completo del correo de invitación. Si vienes de la verificación, regresa a la pestaña en la que la iniciaste."
      />
    );
  }

  if (invitationQuery.isLoading) {
    return <Pending text="Validando invitación..." />;
  }

  if (invalidInvitation) {
    return (
      <ErrorAlert
        className="mx-auto w-full max-w-md"
        title="Invitación inválida"
        message="Este enlace de firma no es válido. Verifica que lo abriste completo desde el correo de invitación."
      />
    );
  }

  if (invitationQuery.isError || !invitation) {
    return (
      <EntryCard>
        <p role="alert" className="text-sm text-destructive">
          No pudimos validar tu invitación por un problema de conexión.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void invitationQuery.refetch()}
        >
          Reintentar
        </Button>
      </EntryCard>
    );
  }

  if (!invitation.availableForSigning || sessionStep === 'unavailable') {
    return (
      <EntryCard title="Documento no disponible para firma">
        <p className="text-sm text-muted-foreground">
          «{invitation.documentName}» ya no tiene una firma pendiente para esta
          invitación.
        </p>
      </EntryCard>
    );
  }

  if (choice === 'guest' && guestSession) {
    return (
      <SigningSessionProvider state={guestSession}>
        <PublicSigningLayout />
      </SigningSessionProvider>
    );
  }

  if (choice === 'login') {
    return <Pending text="Redirigiendo a inicio de sesión..." />;
  }

  if (sessionStep === 'detecting') {
    return <Pending text="Detectando sesión..." />;
  }

  if (sessionStep === 'linking') {
    return <Pending text="Vinculando tu cuenta a la invitación..." />;
  }

  if (sessionStep === 'linked') {
    return <Pending text="Cuenta vinculada. Redirigiendo a tu panel..." />;
  }

  const guestButton = invitation.guestSigningAllowed && (
    <Button type="button" onClick={continueAsGuest}>
      Continuar sin cuenta
    </Button>
  );

  if (sessionStep === 'error') {
    return (
      <EntryCard>
        <p role="alert" className="text-sm text-destructive">
          No pudimos vincular tu cuenta a la invitación. Intenta de nuevo.
        </p>
        <Button type="button" variant="outline" onClick={() => void link()}>
          Reintentar
        </Button>
        {guestButton}
      </EntryCard>
    );
  }

  if (sessionStep === 'mismatch') {
    return (
      <EntryCard title={`Vas a firmar: ${invitation.documentName}`}>
        <p role="alert" className="text-sm text-destructive">
          {ACCOUNT_MISMATCH_MESSAGE}
        </p>
        <p className="text-sm text-muted-foreground">
          La invitación se envió a{' '}
          <span className="font-medium">{invitation.maskedEmail}</span>.
        </p>
        <Button
          type="button"
          disabled={logout.isPending}
          onClick={switchAccount}
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión y usar otra cuenta
        </Button>
        {guestButton}
      </EntryCard>
    );
  }

  return (
    <EntryCard title="Firma este documento">
      <p className="text-sm font-medium">
        Vas a firmar: {invitation.documentName}
      </p>
      <p className="text-sm text-muted-foreground">
        Invitación enviada a{' '}
        <span className="font-medium">{invitation.maskedEmail}</span>
      </p>
      {guestButton}
      <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        ¿Ya tienes una cuenta?
      </div>
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" onClick={goToLogin}>
          <LogIn className="size-4" aria-hidden />
          Iniciar sesión
        </Button>
        <p className="text-xs text-muted-foreground">
          Firmarás desde tu panel privado.
        </p>
      </div>
    </EntryCard>
  );
}
