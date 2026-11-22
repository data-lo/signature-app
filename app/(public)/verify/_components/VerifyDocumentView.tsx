'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  VerificationAlert,
  VerificationSection,
} from '../../public/documents/[id]/_components/VerificationLayout';
import { useDocumentVerification } from '../_hooks/useDocumentVerification';
import { validateVerificationFile } from '../_schemas';
import { VerificationError } from './VerificationError';
import { VerificationFileUpload } from './VerificationFileUpload';
import { VerificationResult } from './VerificationResult';

const STEPS = [
  { title: 'Carga el archivo', description: 'XML de auditoría o PDF final.' },
  {
    title: 'Procesamos el archivo',
    description: 'Identificamos la evidencia disponible para su validación.',
  },
  {
    title: 'Consulta el resultado',
    description: 'Mostramos el estado y los datos verificables.',
  },
];

/**
 * Consulta pública `/verify`: cualquiera carga un XML de auditoría o un PDF final y ve si
 * corresponde a un documento firmado en Firmalo, sin iniciar sesión y sin cambiar de ruta.
 *
 * La pantalla no interpreta el archivo: lo valida (tipo, extensión, tamaño) para habilitar el
 * botón y lo manda tal cual al backend (ver `useDocumentVerification`). Elegir otro archivo
 * descarta el resultado anterior, para que nunca se lea el resultado de un archivo junto al
 * nombre de otro.
 *
 * Sigue la estructura visual de la vista pública de un documento: fondo `muted`, columna centrada
 * y tarjetas `VerificationSection`.
 *
 * @returns La página de verificación.
 *
 * @example
 * ```tsx
 * <VerifyDocumentView />
 * ```
 */
export function VerifyDocumentView() {
  const [file, setFile] = useState<File | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const { verify, result, failure, isPending, reset } =
    useDocumentVerification();

  const fileError = validateVerificationFile(file);
  const canVerify = !!file && !fileError && !isFileLoading && !isPending;

  const handleFileChange = (next: File | null) => {
    setFile(next);
    reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (file && canVerify) verify(file);
  };

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
          >
            F
          </span>
          <span className="text-base font-semibold text-foreground">
            Firmalo
          </span>
        </div>

        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Consulta pública
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Verifica la integridad de un documento
          </h1>
          <p className="text-base text-muted-foreground">
            Carga el XML de auditoría o el PDF final para comprobar si la
            evidencia corresponde a un documento firmado en Firmalo.
          </p>
        </header>

        <VerificationSection
          title="Archivo a verificar"
          description="Aceptamos un XML de auditoría o el PDF final firmado."
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            aria-busy={isPending}
          >
            <VerificationFileUpload
              file={file}
              onFileChange={handleFileChange}
              onLoadingChange={setIsFileLoading}
              errorMessage={fileError ?? undefined}
              disabled={isPending}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!canVerify}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Verificando…
                </>
              ) : (
                'Verificar documento'
              )}
            </Button>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              El archivo se usa únicamente para comprobar su integridad y
              evidencia de firma.
            </p>

            {file &&
              !fileError &&
              !isFileLoading &&
              !result &&
              !failure &&
              !isPending && (
                <VerificationAlert variant="success">
                  <span className="block font-medium">
                    Archivo listo para validar
                  </span>
                  <span className="block">
                    El resultado mostrará integridad, documento vinculado y
                    evidencia disponible.
                  </span>
                </VerificationAlert>
              )}

            {isPending && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Procesando el archivo…
              </p>
            )}
          </form>
        </VerificationSection>

        {failure && <VerificationError failure={failure} />}
        {result && <VerificationResult result={result} />}

        <VerificationSection
          title="Cómo funciona"
          description="Una consulta simple, sin iniciar sesión."
        >
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {step.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {step.description}
                </span>
              </li>
            ))}
          </ol>
        </VerificationSection>
      </main>
    </div>
  );
}
