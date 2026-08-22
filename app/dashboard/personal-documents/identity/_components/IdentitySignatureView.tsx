'use client';

import { Loader2 } from 'lucide-react';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { useIdentityVerification } from '../_hooks/useIdentityVerification';
import { useStartDiditVerification } from '../_hooks/useStartDiditVerification';
import IdentityStepper from './IdentityStepper';
import DiditVerificationCard from './DiditVerificationCard';
import SignatureCard from './SignatureCard';

/**
 * Pantalla "Identidad y firma".
 *
 * Toda la pantalla se dibuja a partir de `signingCredentialStatus`, la variable global que
 * mantiene el backend. El frontend no combina banderas ni deduce el avance por su cuenta: si lo
 * hiciera, tendríamos dos versiones de la misma regla y tarde o temprano se contradirían.
 *
 * Los dos pasos —validar identidad y registrar firma— están siempre visibles; lo que cambia es
 * cuál está activo y cuál bloqueado.
 */
export default function IdentitySignatureView() {
  const { data, isLoading, isError, refetch } = useIdentityVerification();
  const startMutation = useStartDiditVerification();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando tu información...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-destructive">
          No se pudo cargar el estado de tu identidad. Intenta de nuevo más
          tarde.
        </p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => refetch()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { signingCredentialStatus: status } = data;

  return (
    <div
      id="identity-and-signature"
      className="flex w-full max-w-xl flex-col gap-6"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Identidad y firma</h1>
        <p className="text-sm text-muted-foreground">
          Valida tu identidad y registra tu firma para poder firmar documentos.
        </p>
      </header>

      <IdentityStepper
        identity={identityStepState(status)}
        signature={signatureStepState(status)}
      />

      <DiditVerificationCard
        data={data}
        onStart={() => startMutation.mutate()}
        starting={startMutation.isPending}
      />

      <SignatureCard status={status} />
    </div>
  );
}

/** El paso 1 se da por terminado en cuanto la identidad queda aprobada. */
function identityStepState(
  status: SigningCredentialStatus,
): 'done' | 'active' | 'blocked' {
  if (
    status === SigningCredentialStatus.SignaturePending ||
    status === SigningCredentialStatus.Configured
  ) {
    return 'done';
  }

  /**
   * Bloqueado y no "activo": en estos dos estados el usuario no puede avanzar por su cuenta, y
   * mostrar el paso como accionable lo dejaría intentando algo que la pantalla ya no permite.
   */
  if (
    status === SigningCredentialStatus.IdentityVerificationFailed ||
    status === SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded
  ) {
    return 'blocked';
  }

  return 'active';
}

function signatureStepState(
  status: SigningCredentialStatus,
): 'done' | 'active' | 'blocked' {
  if (status === SigningCredentialStatus.Configured) return 'done';
  if (status === SigningCredentialStatus.SignaturePending) return 'active';
  return 'blocked';
}
