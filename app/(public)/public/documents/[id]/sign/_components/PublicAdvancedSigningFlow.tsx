'use client';

import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { setPendingSignatureContext } from '@/lib/pending-signature-context';
import type { GuestInvitation } from '../../biometric-signature/_requests';

interface PublicAdvancedSigningFlowProps {
  documentId: string;
  invitation: GuestInvitation;
}

/**
 * Lugar del flujo de Firma Electrónica Avanzada (e.firma) del invitado en la pantalla pública.
 *
 * Por ahora el invitado llega aquí con su tipo de firma ya resuelto y sólo puede continuar desde
 * una cuenta: guarda el contexto de la invitación y va a `/login`, que vincula la cuenta al entrar y
 * lo lleva al documento, donde firma por el flujo privado de siempre. Los pasos públicos —código al
 * correo, visor del documento y formulario `.cer` + `.key` + contraseña— se montan en este mismo
 * componente, sin cambiar de ruta.
 */
export default function PublicAdvancedSigningFlow({
  documentId,
  invitation,
}: PublicAdvancedSigningFlowProps) {
  const router = useRouter();

  function continueWithAccount() {
    setPendingSignatureContext({ documentId, ...invitation });
    router.push('/login');
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Firma Electrónica Avanzada</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          Este documento se firma con tu e.firma: necesitarás tu llave privada
          (.key), tu certificado (.cer) y su contraseña.
        </p>
        <p className="text-sm text-muted-foreground">
          Inicia sesión o crea una cuenta con el correo de esta invitación para
          firmarlo desde tu panel.
        </p>
        <Button type="button" onClick={continueWithAccount}>
          <KeyRound className="size-4" aria-hidden />
          Continuar para firmar
        </Button>
      </CardContent>
    </Card>
  );
}
