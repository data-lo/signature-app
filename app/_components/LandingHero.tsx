import Link from 'next/link';
import { FileText } from 'lucide-react';

/**
 * Íconos propios del sistema Firmalo
 * Construidos sobre la misma lógica del ícono de Datalo:
 * círculo interrumpido + cápsula interna, cambia solo
 * el contenido de la cápsula y el color de acento.
 */
function IconGrafo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 78,55 A 33,33 0 0 1 24,49" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <path d="M 24,29 A 33,33 0 0 1 78,23" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="76" cy="39" rx="12" ry="19" fill="currentColor" />
      <path d="M 68,39 Q 72,29 76,39 T 84,39" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconFiel({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 78,55 A 33,33 0 0 1 24,49" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <path d="M 24,29 A 33,33 0 0 1 78,23" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="76" cy="39" rx="12" ry="19" fill="currentColor" />
      <path d="M 69,39 L 74,45 L 84,31" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function IconIndexacion({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 78,55 A 33,33 0 0 1 24,49" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <path d="M 24,29 A 33,33 0 0 1 78,23" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="76" cy="39" rx="12" ry="19" fill="currentColor" />
      <circle cx="73" cy="34" r="5" stroke="white" strokeWidth="2.5" fill="none" />
      <line x1="77" y1="38" x2="81" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingHero() {
  return (
    <section className="px-8 py-16 text-center">
      {/* Lockup real: símbolo + wordmark + endoso "by Datalo" */}
      <img
        src="/brand/firmalo-logo.svg"
        alt="Firmalo by Datalo"
        className="mx-auto h-20 w-auto sm:h-40"
      />
      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
        Firmas que se convierten en datos
      </p>

      <br />

      <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        Todo lo que necesitas para firmar, gestionar y buscar dentro de tus documentos en un solo lugar
      </h1>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-firmalo px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-firmalo-fiel"
        >
          CREAR CUENTA GRATIS
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-6 py-2.5 text-sm font-semibold tracking-wide text-muted-foreground hover:bg-muted"
        >
          INICIAR SESIÓN
        </Link>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 text-left sm:grid-cols-2">
        {/* Firmalo Grafo */}
        <div className="rounded-xl border border-firmalo-grafo/30 bg-firmalo-grafo/10 p-8">
          <div className="flex size-11 items-center justify-center rounded-lg bg-firmalo-grafo text-white">
            <IconGrafo />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Firmalo Grafo
          </h3>
          <p className="mt-1 text-sm font-medium text-firmalo-grafo">
            Firma digital simple
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Estampado de firma + cadena de integridad + verificación del firmante
            <br />
            Útil para una gran cantidad de documentos administrativos y de gestión interna
          </p>
        </div>

        {/* Firmalo FIEL — con badge de validez normativa */}
        <div className="relative rounded-xl border border-firmalo-fiel/30 bg-firmalo-fiel/10 p-8">
          <span className="absolute right-6 top-6 rounded-full bg-firmalo-fiel/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-firmalo-fiel">
            NOM-151 · e.firma SAT
          </span>
          <div className="flex size-11 items-center justify-center rounded-lg bg-firmalo-fiel text-white">
            <IconFiel />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Firmalo FIEL
          </h3>
          <p className="mt-1 text-sm font-medium text-firmalo-fiel">
            Firma electrónica avanzada
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Respaldada por tu e.firma del SAT, procesada con NOM-151 y sello de tiempo.
            <br />
            Útil para documentos legales como contratos, pagarés, convocatorias
          </p>
        </div>
      </div>

      {/* Indexación — capacidad transversal, no una tarjeta más */}
      <div className="mx-auto mt-6 flex max-w-5xl items-center gap-4 rounded-xl bg-firmalo/10 p-6 text-left">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-firmalo text-white">
          <IconIndexacion />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Indexación inteligente
          </h3>
          <p className="text-sm text-muted-foreground">
            De la firma a la búsqueda, sin abrir un solo PDF.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl rounded-xl bg-amber-50 p-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 text-left shadow-sm">
            <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-700">
              Contrato privado de arrendamiento
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded bg-gray-200"
                  style={{ width: `${90 - (i % 3) * 15}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 text-left shadow-sm">
            <p className="text-sm font-semibold text-gray-900">
              Ingresa la información del firmante
            </p>
            <label className="mt-3 block text-[10px] font-semibold tracking-wide text-gray-500">
              CORREO ELECTRÓNICO
            </label>
            <div className="mt-1 rounded-md border border-firmalo-grafo/40 px-2 py-1.5 text-xs text-gray-700">
              luis@correo.com
            </div>
            <p className="mt-3 text-[10px] font-semibold tracking-wide text-gray-500">
              MÉTODO DE FIRMA
            </p>
            <div className="mt-1.5 flex flex-col gap-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="flex size-3.5 items-center justify-center rounded-[3px] bg-firmalo-grafo text-[9px] text-white">
                  ✓
                </span>
                Firma electrónica simple
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="size-4 text-gray-400" />
              Contrato de arrendamiento.pdf
            </div>
            <label className="mt-3 block text-[10px] font-semibold tracking-wide text-gray-500">
              MENSAJE PARA FIRMANTES
            </label>
            <div className="mt-1 h-6 rounded-md border border-gray-200" />
            <div className="mt-3 rounded-md bg-firmalo py-1.5 text-center text-xs font-semibold tracking-wide text-white">
              SOLICITAR FIRMAS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}