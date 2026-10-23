import { redirect } from 'next/navigation';

interface LegacyBiometricSignaturePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ collabId?: string; email?: string }>;
}

/**
 * Ruta anterior de la firma biométrica del invitado. La pantalla pública de firma es ahora una sola,
 * `/public/documents/:id/sign`, que resuelve el tipo de firma del documento; ésta sólo redirige.
 *
 * No se elimina porque todavía llegan aquí enlaces viejos: sesiones de Didit abiertas antes del
 * cambio, cuyo callback apunta a esta URL, y pestañas o marcadores de invitados. La query
 * (`collabId`, `email`) se conserva; el acceso de invitado guardado en `sessionStorage` sigue
 * siendo el mismo, así que el invitado retoma donde iba.
 *
 * @param props.params - `id` del documento.
 * @param props.searchParams - `collabId` y `email` de la invitación, si venían.
 * @returns Nunca: redirige.
 *
 * @example
 * ```tsx
 * // /public/documents/doc-1/biometric-signature?collabId=c-1 → /public/documents/doc-1/sign?collabId=c-1
 * ```
 */
export default async function LegacyBiometricSignaturePage({
  params,
  searchParams,
}: LegacyBiometricSignaturePageProps) {
  const { id } = await params;
  const { collabId, email } = await searchParams;

  const query = new URLSearchParams();
  if (collabId) query.set('collabId', collabId);
  if (email) query.set('email', email);
  const search = query.toString();
  const suffix = search ? `?${search}` : '';

  redirect(`/public/documents/${id}/sign${suffix}`);
}
