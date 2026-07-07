'use client';

import { CircleHelp, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { SignerEntry } from './DocumentPreparationView';

export interface SignerFieldErrors {
  email?: string;
  methods?: string;
  rfc?: string;
}

interface SignerFormCardProps {
  signer: SignerEntry;
  errors?: SignerFieldErrors;
  onChange: (signer: SignerEntry) => void;
  onRemove: () => void;
}

export default function SignerFormCard({ signer, errors, onChange, onRemove }: SignerFormCardProps) {
  return (
    <div className="rounded-md bg-gray-100 p-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs font-semibold tracking-wide text-gray-500">
          DATOS REQUERIDOS <span className="text-red-500">*</span>
        </span>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            value={signer.email}
            onChange={(e) => onChange({ ...signer, email: e.target.value })}
            placeholder="correo@dominio.com"
            className={`w-full rounded-md border bg-white px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              errors?.email ? 'border-destructive' : 'border-gray-300 focus-visible:border-ring'
            }`}
          />
          {errors?.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700">Nombre</label>
          <input
            value={signer.name}
            onChange={(e) => onChange({ ...signer, name: e.target.value })}
            placeholder="Nombre del firmante"
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-700">
            Métodos de firma permitidos <span className="text-red-500">*</span>
            <CircleHelp className="size-3.5 text-gray-400" />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={signer.allowAdvanced}
                onCheckedChange={(checked) => onChange({ ...signer, allowAdvanced: checked === true })}
              />
              Firma electrónica avanzada (e.firma)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={signer.allowSimple}
                onCheckedChange={(checked) => onChange({ ...signer, allowSimple: checked === true })}
              />
              Firma electrónica simple
            </label>
          </div>
          {errors?.methods && <p className="mt-1 text-xs text-destructive">{errors.methods}</p>}
        </div>

        {signer.allowAdvanced && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-700">
              Restricción de RFC
              <CircleHelp className="size-3.5 text-gray-400" />
            </label>
            <input
              value={signer.rfc}
              onChange={(e) => onChange({ ...signer, rfc: e.target.value })}
              placeholder="12 o 13 caracteres alfanuméricos"
              maxLength={13}
              className={`w-full rounded-md border bg-white px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                errors?.rfc ? 'border-destructive' : 'border-gray-300 focus-visible:border-ring'
              }`}
            />
            {errors?.rfc && <p className="mt-1 text-xs text-destructive">{errors.rfc}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
