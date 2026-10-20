'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignatureType } from '@/lib/enums/document';
import { setPendingSignatureContext } from '@/lib/pending-signature-context';
import type { GuestInvitation } from '../../biometric-signature/_requests';
import { readStoredGuestAccess } from '../../biometric-signature/_hooks/useGuestAccess';
import PublicBiometricSigningFlow from '../../biometric-signature/_components/PublicBiometricSigningFlow';
import { getPublicSigningMethodRequest } from '../_requests';
import PublicAdvancedSigningFlow from './PublicAdvancedSigningFlow';

interface PublicSigningMethodRouterProps {
  documentId: string;
  /** Colaborador y correo del enlace de invitación; `null` si la URL no los trae. */
  invitation: GuestInvitation | null;
}

/**
 * Tipo de firma de la invitación, resuelto por el backend.
 *
 * @param documentId - Documento.
 * @param invitation - Colaborador y correo del enlace, o `null` (no se consulta).
 * @returns La consulta de React Query; `data` es `BIOMETRIC`, `FIEL` o `null`.
 *
 * @example
 * ```ts
 * const { data: signatureType } = usePublicSigningMethod('doc-1', invitation);
 * ```
 */
export function usePublicSigningMethod(
  documentId: string,
  invitation: GuestInvitation | null,
) {
  return useQuery({
    queryKey: [
      'publicSigningMethod',
      documentId,
      invitation?.collaboratorId,
      invitation?.email,
    ],
    queryFn: () => getPublicSigningMethodRequest(documentId, invitation!),
    enabled: Boolean(invitation),
    retry: false,
  });
}

/**
 * Pantalla pública única de firma del invitado: pregunta al backend qué tipo de firma exige el
 * documento y monta el flujo de ese tipo. La URL es la misma para todos los tipos y el invitado
 * nunca elige; no hay ningún control que lo permita.
 *
 * - `BIOMETRIC` → `PublicBiometricSigningFlow` (código al correo, consentimiento y ubicación,
 *   Didit, estado de la firma).
 * - `FIEL` → `PublicAdvancedSigningFlow`.
 * - `null` (la invitación no se firma aquí: cuenta ya vinculada, correo distinto, firma simple) →
 *   se le ofrece iniciar sesión, que es por donde se firma con cuenta.
 *
 * **Sin invitación en la URL** sólo hay un caso válido: volver de Didit, cuyo callback no lleva ni
 * colaborador ni correo. Ahí no se puede consultar el tipo, pero un acceso biométrico vigente en
 * esta pestaña ya prueba que la firma en curso es biométrica, y el flujo retoma con él.
 */
export default function PublicSigningMethodRouter({
  documentId,
  invitation,
}: PublicSigningMethodRouterProps) {
  const router = useRouter();
  const methodQuery = usePublicSigningMethod(documentId, invitation);
  // `null` hasta leer `sessionStorage` (sólo hace falta sin invitación).
  const [resumesBiometric, setResumesBiometric] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (invitation) return;
    setResumesBiometric(Boolean(readStoredGuestAccess(documentId)));
  }, [documentId, invitation]);

  if (!invitation) {
    if (resumesBiometric === null) return null;
    if (resumesBiometric) {
      return (
        <PublicBiometricSigningFlow documentId={documentId} invitation={null} />
      );
    }
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Enlace inválido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Abre esta página desde el enlace del correo de invitación. Si vienes
            de la verificación, regresa a la pestaña en la que la iniciaste.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (methodQuery.isLoading) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Verificando tu invitación...
      </p>
    );
  }

  if (methodQuery.isError) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col gap-4 pt-6">
          <p role="alert" className="text-sm text-destructive">
            No pudimos verificar tu invitación. Intenta de nuevo en unos
            momentos.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void methodQuery.refetch()}
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (methodQuery.data === SignatureType.BIOMETRIC) {
    return (
      <PublicBiometricSigningFlow
        documentId={documentId}
        invitation={invitation}
      />
    );
  }

  if (methodQuery.data === SignatureType.Fiel) {
    return (
      <PublicAdvancedSigningFlow
        documentId={documentId}
        invitation={invitation}
      />
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Firma desde tu cuenta</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Esta invitación no se firma desde esta página. Inicia sesión con el
          correo de la invitación para ver el documento.
        </p>
        <Button
          type="button"
          onClick={() => {
            setPendingSignatureContext({ documentId, ...invitation });
            router.push('/login');
          }}
        >
          Iniciar sesión
        </Button>
      </CardContent>
    </Card>
  );
}
