'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildLoginPath } from '@/lib/auth-redirect';
import { getAuthToken } from '@/lib/cookies';
import { clearPublicSigningContext } from '@/lib/public-signing-context';

interface AccountSigningLoginProps {
  /** Documento de la invitación; el backend sólo lo manda si se firma desde una cuenta activa. */
  documentId: string;
}

/**
 * Ruta del documento en el panel, donde el firmante con cuenta revisa y firma.
 *
 * @param documentId - Documento de la invitación.
 * @returns `/dashboard/documents/:documentId`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * accountDocumentPath('doc-1'); // '/dashboard/documents/doc-1'
 * ```
 */
export function accountDocumentPath(documentId: string): string {
  return `/dashboard/documents/${encodeURIComponent(documentId)}`;
}

/**
 * Invitación individual (`/sign/:token`, `/sign/launch/:token`) de un firmante que firma desde su
 * cuenta activa —p. ej. firma simple de un documento creado por la API de integración para un
 * correo que ya tiene cuenta—. En vez de sólo informarlo, ofrece la acción:
 *
 * - Con sesión, abre el documento en el panel.
 * - Sin sesión, va a `/login?returnTo=` con ese documento: al autenticarse vuelve a él, listo para
 *   firmar.
 *
 * Borra el contexto de la firma pública de invitado que pudiera quedar en la pestaña: si no, el
 * login lo usaría antes que `returnTo` y abriría otro documento.
 *
 * @param props.documentId - Documento de la invitación.
 * @returns La tarjeta con el botón para iniciar sesión.
 *
 * @example
 * ```tsx
 * <AccountSigningLogin documentId="doc-1" />
 * ```
 */
export default function AccountSigningLogin({
  documentId,
}: AccountSigningLoginProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const hasSession = Boolean(getAuthToken());

  function continueToDocument() {
    const destination = accountDocumentPath(documentId);
    clearPublicSigningContext();
    setRedirecting(true);
    router.push(hasSession ? destination : buildLoginPath(destination));
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Inicia sesión para firmar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p role="status" className="text-sm text-muted-foreground">
          Esta invitación está vinculada a tu cuenta de Firmalo. Inicia sesión
          para revisar y firmar el documento.
        </p>
        <Button
          type="button"
          disabled={redirecting}
          onClick={continueToDocument}
        >
          {redirecting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="size-4" aria-hidden />
          )}
          {hasSession ? 'Ir al documento' : 'Iniciar sesión'}
        </Button>
      </CardContent>
    </Card>
  );
}
