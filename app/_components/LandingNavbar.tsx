import Link from 'next/link';
import { FileSignature } from 'lucide-react';

const navItems = ['SOLUCIONES', 'RECURSOS', 'CLIENTES', 'VM'];

export default function LandingNavbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-8 h-16">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2">
          <FileSignature className="size-6 text-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-foreground">Signature</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <span
              key={item}
              className="text-xs font-semibold tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
            >
              {item}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <Link
          href="/login"
          className="text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground"
        >
          INICIAR SESIÓN
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold tracking-wide text-white hover:bg-emerald-600"
        >
          CREAR CUENTA
        </Link>
      </div>
    </header>
  );
}
