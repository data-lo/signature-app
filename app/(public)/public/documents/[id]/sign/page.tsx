import PublicInvitationEntry from './_components/PublicInvitationEntry';

interface PublicSigningPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ collabId?: string; email?: string }>;
}

/**
 * Pantalla pública de firma para invitados, una sola para todos los tipos de firma.
 * `PublicInvitationEntry` valida la invitación y resuelve si el firmante sigue con su cuenta o sin
 * ella; el tipo de firma lo decide el backend y `PublicSigningMethodRouter` monta su flujo. Se
 * llega desde el enlace del correo (vía `/access-document`), de regreso del login o de Didit.
 * Queda fuera del middleware de sesión, como todo `/public/*`.
 *
 * @param props.params - `id` del documento.
 * @param props.searchParams - `collabId` y `email` de la invitación.
 * @returns La pantalla de firma del invitado.
 *
 * @example
 * ```tsx
 * // /public/documents/doc-1/sign?collabId=c-1&email=ana%40correo.mx
 * ```
 */
export default async function PublicSigningPage({
  params,
  searchParams,
}: PublicSigningPageProps) {
  const { id } = await params;
  const { collabId, email } = await searchParams;

  return (
    <main className="min-h-screen bg-muted p-4 sm:p-8">
      <PublicInvitationEntry
        documentId={id}
        collaboratorId={collabId ?? null}
        email={email ?? null}
      />
    </main>
  );
}
