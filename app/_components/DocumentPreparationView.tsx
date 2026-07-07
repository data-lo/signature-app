'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Bell, CircleHelp, FileText, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SignerFormCard, { type SignerFieldErrors } from './SignerFormCard';
import SpectatorFormCard, { type SpectatorFieldErrors } from './SpectatorFormCard';
import DocumentSentSuccess from './DocumentSentSuccess';

const DocumentPreviewPane = dynamic(() => import('./DocumentPreviewPane'), { ssr: false });

export interface SignerEntry {
  id: string;
  email: string;
  name: string;
  allowAdvanced: boolean;
  allowSimple: boolean;
  rfc: string;
}

export interface SpectatorEntry {
  id: string;
  email: string;
  name: string;
}

interface DocumentPreparationViewProps {
  file: File;
  documentName: string;
  onCancel: () => void;
  onRequestSignatures: (signers: SignerEntry[]) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_REGEX = /^[A-Za-z0-9]{12,13}$/;

function validateSigner(signer: SignerEntry): SignerFieldErrors {
  const errors: SignerFieldErrors = {};
  if (!signer.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!EMAIL_REGEX.test(signer.email)) {
    errors.email = 'Correo electrónico inválido';
  }
  if (!signer.allowAdvanced && !signer.allowSimple) {
    errors.methods = 'Selecciona al menos un método de firma';
  }
  if (signer.allowAdvanced) {
    const rfc = signer.rfc.trim();
    if (!rfc) {
      errors.rfc = 'El RFC es obligatorio para firma electrónica avanzada';
    } else if (!RFC_REGEX.test(rfc)) {
      errors.rfc = 'El RFC debe tener 12 o 13 caracteres alfanuméricos';
    }
  }
  return errors;
}

function validateSpectator(spectator: SpectatorEntry): SpectatorFieldErrors {
  const errors: SpectatorFieldErrors = {};
  if (!spectator.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!EMAIL_REGEX.test(spectator.email)) {
    errors.email = 'Correo electrónico inválido';
  }
  return errors;
}

function createEmptySigner(): SignerEntry {
  return { id: crypto.randomUUID(), email: '', name: '', allowAdvanced: true, allowSimple: false, rfc: '' };
}

function createEmptySpectator(): SpectatorEntry {
  return { id: crypto.randomUUID(), email: '', name: '' };
}

export default function DocumentPreparationView({
  file,
  documentName,
  onCancel,
  onRequestSignatures,
}: DocumentPreparationViewProps) {
  const [activeTab, setActiveTab] = useState<'preparacion' | 'documento'>('preparacion');
  const [signers, setSigners] = useState<SignerEntry[]>([]);
  const [spectators, setSpectators] = useState<SpectatorEntry[]>([]);
  const [signerErrors, setSignerErrors] = useState<Record<string, SignerFieldErrors>>({});
  const [spectatorErrors, setSpectatorErrors] = useState<Record<string, SpectatorFieldErrors>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [participantMessageEnabled, setParticipantMessageEnabled] = useState(false);
  const [participantMessage, setParticipantMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleAddSigner() {
    setSigners((prev) => [...prev, createEmptySigner()]);
    setGeneralError(null);
  }

  function handleChangeSigner(updated: SignerEntry) {
    setSigners((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleRemoveSigner(id: string) {
    setSigners((prev) => prev.filter((s) => s.id !== id));
    setSignerErrors((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
  }

  function handleAddSpectator() {
    setSpectators((prev) => [...prev, createEmptySpectator()]);
  }

  function handleChangeSpectator(updated: SpectatorEntry) {
    setSpectators((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleRemoveSpectator(id: string) {
    setSpectators((prev) => prev.filter((s) => s.id !== id));
    setSpectatorErrors((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
  }

  function handleRequestSignaturesClick() {
    if (signers.length === 0) {
      setGeneralError('Agrega al menos un firmante para continuar.');
      return;
    }

    const nextSignerErrors: Record<string, SignerFieldErrors> = {};
    signers.forEach((signer) => {
      const errors = validateSigner(signer);
      if (Object.keys(errors).length > 0) nextSignerErrors[signer.id] = errors;
    });

    const nextSpectatorErrors: Record<string, SpectatorFieldErrors> = {};
    spectators.forEach((spectator) => {
      const errors = validateSpectator(spectator);
      if (Object.keys(errors).length > 0) nextSpectatorErrors[spectator.id] = errors;
    });

    setSignerErrors(nextSignerErrors);
    setSpectatorErrors(nextSpectatorErrors);

    if (Object.keys(nextSignerErrors).length > 0 || Object.keys(nextSpectatorErrors).length > 0) {
      setGeneralError('Revisa los campos marcados antes de continuar.');
      return;
    }

    setGeneralError(null);
    onRequestSignatures(signers);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-7xl px-8 py-8">
        <DocumentSentSuccess onGoToDocuments={onCancel} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Preparación del documento</h1>
        <div className="flex overflow-hidden rounded-md">
          <button
            type="button"
            onClick={() => setActiveTab('preparacion')}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide ${
              activeTab === 'preparacion' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            PREPARACIÓN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documento')}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide ${
              activeTab === 'documento' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            DOCUMENTO
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <div className="min-w-0 flex-1">
          {activeTab === 'documento' ? (
            <div className="h-[70vh] overflow-hidden rounded-md border border-gray-200">
              <DocumentPreviewPane file={file} />
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-base font-semibold text-gray-900">Añadir participantes</h2>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                  <span>Añadir revisores: ¿Se necesita un visto bueno para este documento?</span>
                  <CircleHelp className="size-3.5" />
                  <span className="ml-auto shrink-0 cursor-pointer text-sm font-medium text-emerald-600 hover:underline">
                    Obtener
                  </span>
                </div>

                <div className="mt-4 rounded-md bg-gray-100 p-4">
                  <span className="inline-block rounded-md bg-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
                    Firmantes
                  </span>

                  {signers.length === 0 ? (
                    <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-md bg-white py-10 text-center">
                      <UserPlus className="size-8 text-gray-300" />
                      <p className="max-w-xs text-sm text-gray-500">
                        Da clic en &quot;Añadir firmante&quot; para agregar a cada persona que deba firmar este
                        documento.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      {signers.map((signer) => (
                        <SignerFormCard
                          key={signer.id}
                          signer={signer}
                          errors={signerErrors[signer.id]}
                          onChange={handleChangeSigner}
                          onRemove={() => handleRemoveSigner(signer.id)}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddSigner}
                    className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
                  >
                    + Añadir firmante
                  </button>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-base font-semibold text-gray-900">Añadir espectadores</h2>
                <p className="mt-2 max-w-xl text-sm text-gray-500">
                  Los espectadores son notificados cada vez que alguien firma el documento y también reciben
                  una copia del documento firmado en su correo.
                </p>

                {spectators.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    {spectators.map((spectator) => (
                      <SpectatorFormCard
                        key={spectator.id}
                        spectator={spectator}
                        errors={spectatorErrors[spectator.id]}
                        onChange={handleChangeSpectator}
                        onRemove={() => handleRemoveSpectator(spectator.id)}
                      />
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleAddSpectator}
                  className="mt-4 border-emerald-500 text-emerald-600"
                >
                  + AÑADIR ESPECTADOR
                </Button>
              </section>
            </>
          )}
        </div>

        <aside className="w-80 shrink-0 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Documento</h2>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileText className="size-5 text-gray-400" />
            {documentName}.pdf
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-sm text-gray-400">
            <span>Fecha de expiración</span>
            <CircleHelp className="size-3.5" />
            <span className="ml-auto shrink-0 cursor-pointer text-sm font-medium text-emerald-600 hover:underline">
              Obtener
            </span>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-700">
              Recordatorios
              <Bell className="size-3.5 text-gray-400" />
            </label>
            <Select defaultValue="3d">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3d">Cada tres días (predeterminado)</SelectItem>
                <SelectItem value="7d">Cada semana</SelectItem>
                <SelectItem value="never">Nunca</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              Mensaje para participantes
              <CircleHelp className="size-3.5 text-gray-400" />
            </span>
            <Switch checked={participantMessageEnabled} onCheckedChange={setParticipantMessageEnabled} />
          </div>

          {participantMessageEnabled && (
            <div className="mt-3">
              <Textarea
                value={participantMessage}
                onChange={(e) => setParticipantMessage(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Hola, fírmalo por favor."
                className="min-h-20"
              />
              <p className="mt-1 text-xs text-gray-400">Límite de 500 caracteres</p>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-500">
            Por favor, revisa el documento que estás preparando y los correos de los firmantes. Cuando estés
            listo para solicitar las firmas, da clic en el botón de &quot;Solicitar firmas&quot;.
          </p>

          {generalError && <p className="mt-3 text-xs text-destructive">{generalError}</p>}

          <Button variant="brand" onClick={handleRequestSignaturesClick} className="mt-6 w-full">
            SOLICITAR FIRMAS
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            CANCELAR
          </button>
        </aside>
      </div>
    </main>
  );
}
