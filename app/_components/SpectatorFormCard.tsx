'use client';

import { X } from 'lucide-react';
import type { SpectatorEntry } from './DocumentPreparationView';

export interface SpectatorFieldErrors {
  email?: string;
}

interface SpectatorFormCardProps {
  spectator: SpectatorEntry;
  errors?: SpectatorFieldErrors;
  onChange: (spectator: SpectatorEntry) => void;
  onRemove: () => void;
}

export default function SpectatorFormCard({ spectator, errors, onChange, onRemove }: SpectatorFormCardProps) {
  return (
    <div className="rounded-md bg-muted p-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          DATOS REQUERIDOS <span className="text-red-500">*</span>
        </span>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            value={spectator.email}
            onChange={(e) => onChange({ ...spectator, email: e.target.value })}
            placeholder="correo@dominio.com"
            className={`w-full rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              errors?.email ? 'border-destructive' : 'border-input focus-visible:border-ring'
            }`}
          />
          {errors?.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground">Nombre</label>
          <input
            value={spectator.name}
            onChange={(e) => onChange({ ...spectator, name: e.target.value })}
            placeholder="Nombre del espectador"
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
    </div>
  );
}
