'use client';

import { Loader2 } from 'lucide-react';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { useIdentityVerification } from '../_hooks/useIdentityVerification';
import { useStartDiditVerification } from '../_hooks/useStartDiditVerification';
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
 *
 * Esta vista sustituye al flujo anterior de documentos personales, en el que el usuario subía su
 * INE a mano junto con la firma: ahora la identificación la captura y valida Didit, así que la
 * pantalla sólo pide la firma PNG y sólo después de que la identidad quedó aprobada. Los
 * componentes de aquel flujo siguen en `../../_components` sin consumidor — ver la nota en cada
 * uno.
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
      <div className="flex flex-col items-start gap-3">
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
    <div id="signature-documents" className="flex w-full flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">
          Aquí puedes iniciar el proceso de verificación de identidad y
          registrar tu firma para firmar de manera simple.
        </p>
      </header>

      <div className="flex w-full flex-col gap-6">
        <DiditVerificationCard
          data={data}
          onStart={() => startMutation.mutate()}
          starting={startMutation.isPending}
        />

        <SignatureCard status={status} />
      </div>
    </div>
  );
}
