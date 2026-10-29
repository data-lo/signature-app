import SigningSessionScreen from '@/app/(public)/_signing/invitation/SigningSessionScreen';
import { signingPageMetadata } from '@/app/(public)/_signing/invitation/signing-page-metadata';

export const metadata = signingPageMetadata;

/**
 * Retoma la sesión pública de firma con su cookie, sin token en la URL. Es a donde vuelve Didit
 * (verificación de identidad de la firma simple y firma biométrica) y sirve para recargar la página
 * una vez validado el código. Sin sesión vigente muestra que hay que volver a abrir el enlace.
 *
 * @returns La pantalla de la sesión.
 *
 * @example
 * ```tsx
 * // /sign/session
 * ```
 */
export default function SigningSessionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4 sm:p-8">
      <SigningSessionScreen />
    </main>
  );
}
