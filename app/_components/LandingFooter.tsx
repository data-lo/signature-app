import Link from 'next/link';
import { FileSignature } from 'lucide-react';

export default function LandingFooter() {
  return (
    <>
      <section className="bg-amber-50 px-8 py-16 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-white shadow-sm">
          <FileSignature className="size-9 text-emerald-500" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-foreground">
          Estamos aquí para ayudarte a empezar
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Crea tu cuenta gratis y prepara tu primer documento para firmar en
          minutos.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-md bg-emerald-500 px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-emerald-600"
        >
          CREAR CUENTA
        </Link>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-8 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>ESPAÑOL</span>
        <div className="flex items-center gap-6">
          <span className="cursor-pointer hover:text-foreground">
            Términos de uso y privacidad
          </span>
          <span className="cursor-pointer hover:text-foreground">Blog</span>
        </div>
        <span>© {new Date().getFullYear()} Signature</span>
      </footer>
    </>
  );
}
