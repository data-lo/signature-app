import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import SignupForm from './_components/SignupForm';

interface SignupPageProps {
  searchParams: Promise<{ rfc?: string; token?: string }>;
}

/**
 * La clave del sitio de Turnstile se lee acá, en el servidor, y viaja al formulario como prop
 * (Server Component → Client Component). Es deliberado que NO sea una `NEXT_PUBLIC_*`: esas se
 * incrustan en el bundle durante `next build`, así que cada entorno (dev, staging, producción)
 * necesitaría su propia imagen. Leída en el servidor, la misma imagen sirve para todos y la clave
 * se resuelve por variable de entorno al arrancar el contenedor.
 *
 * La clave del sitio es pública por diseño (el navegador la manda a Cloudflare para pintar el
 * reto); la secreta, `TURNSTILE_SECRET_KEY`, vive solo en signature-server.
 */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { rfc, token } = await searchParams;
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="flex flex-col gap-6 max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2">
          <FileSignature className="size-6 text-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Signature
          </span>
        </Link>
        <SignupForm
          defaultRfc={rfc}
          invitationToken={token}
          turnstileSiteKey={turnstileSiteKey}
        />
      </div>
    </div>
  );
}
