import { redirect } from 'next/navigation';

interface LegacyAdvancedSignaturePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ collabId?: string; email?: string }>;
}

/**
 * Ruta anterior de la Firma Avanzada (e.firma) del invitado. La pantalla pública de firma es una
 * sola, `/public/documents/:id/sign`: valida la invitación, ofrece iniciar sesión o continuar sin
 * cuenta y monta `PublicAdvancedSigningFlow` para los firmantes FIEL. Ésta sólo redirige, igual que
 * `/biometric-signature`.
 *
 * Se conserva por los enlaces que ya circulan (pestañas y marcadores de invitados). La query
 * (`collabId`, `email`) se conserva; el acceso de invitado guardado en `sessionStorage` es el mismo,
 * así que quien ya había validado su código retoma la firma al elegir "Continuar sin cuenta".
 *
 * @param props.params - `id` del documento.
 * @param props.searchParams - `collabId` y `email` de la invitación, si venían.
 * @returns Nunca: redirige.
 *
 * @example
 * ```tsx
 * // /public/documents/doc-1/advanced-signature?collabId=c-1 → /public/documents/doc-1/sign?collabId=c-1
 * ```
 */
export default async function LegacyAdvancedSignaturePage({
  params,
  searchParams,
}: LegacyAdvancedSignaturePageProps) {
  const { id } = await params;
  const { collabId, email } = await searchParams;

  const query = new URLSearchParams();
  if (collabId) query.set('collabId', collabId);
  if (email) query.set('email', email);
  const search = query.toString();
  const suffix = search ? `?${search}` : '';

  redirect(`/public/documents/${id}/sign${suffix}`);
}
