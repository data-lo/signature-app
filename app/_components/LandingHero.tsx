import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function LandingHero() {
  return (
    <section className="px-8 py-16 text-center">
      <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        Todo lo que necesitas para firmar y gestionar documentos digitalmente en un solo lugar
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
        Diseñado cuidadosamente para ofrecer la mejor experiencia a tus firmantes y a tu equipo.
      </p>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-emerald-500 px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-emerald-600"
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

      <div className="mx-auto mt-16 max-w-5xl rounded-xl bg-amber-50 p-10">
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
            <p className="text-sm font-semibold text-gray-900">Ingresa la información del firmante</p>
            <label className="mt-3 block text-[10px] font-semibold tracking-wide text-gray-500">
              CORREO ELECTRÓNICO
            </label>
            <div className="mt-1 rounded-md border border-emerald-400 px-2 py-1.5 text-xs text-gray-700">
              luis@correo.com
            </div>
            <p className="mt-3 text-[10px] font-semibold tracking-wide text-gray-500">MÉTODO DE FIRMA PERMITIDO</p>
            <div className="mt-1.5 flex flex-col gap-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="flex size-3.5 items-center justify-center rounded-[3px] bg-emerald-500 text-[9px] text-white">
                  ✓
                </span>
                Firma electrónica avanzada (e.firma)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 rounded-[3px] border border-gray-300" />
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
            <div className="mt-3 rounded-md bg-emerald-500 py-1.5 text-center text-xs font-semibold tracking-wide text-white">
              SOLICITAR FIRMAS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
