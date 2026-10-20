import GuestAdvancedSignatureView from './_components/GuestAdvancedSignatureView';

interface GuestAdvancedSignaturePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ collabId?: string; email?: string }>;
}

/**
 * Pantalla pública de Firma Electrónica Avanzada para invitados. Se llega desde el enlace del
 * correo (vía `/access-document`), que trae el colaborador y el correo de la invitación. Queda
 * fuera del middleware de sesión, como todo `/public/*`: el invitado elige entre firmar desde su
 * cuenta o sin cuenta, validando un código enviado a su correo.
 *
 * @param props.params - `id` del documento.
 * @param props.searchParams - `collabId` y `email` de la invitación.
 * @returns La vista de firma del invitado.
 *
 * @example
 * ```tsx
 * // /public/documents/doc-1/advanced-signature?collabId=c-1&email=ana%40correo.mx
 * ```
 */
export default async function GuestAdvancedSignaturePage({
  params,
  searchParams,
}: GuestAdvancedSignaturePageProps) {
  const { id } = await params;
  const { collabId, email } = await searchParams;

  return (
    <main className="min-h-screen bg-muted p-4 sm:p-8">
      <GuestAdvancedSignatureView
        documentId={id}
        invitation={
          collabId && email ? { collaboratorId: collabId, email } : null
        }
      />
    </main>
  );
}
