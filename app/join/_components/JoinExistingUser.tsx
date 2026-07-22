'use client';

import { Button } from '@/components/ui/button';

interface JoinExistingUserProps {
  organizationName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

export default function JoinExistingUser({
  organizationName,
  onConfirm,
  onCancel,
  confirming,
}: JoinExistingUserProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground">
        Unirse a <strong>{organizationName}</strong> con tu usuario.
      </p>

      <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-3 text-xs dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
        Tu perfil principal es independiente; tus datos personales y otras
        organizaciones no se mezclarán ni serán visibles para esta nueva
        organización.
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={confirming}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? 'Uniendo...' : 'Unirse'}
        </Button>
      </div>
    </div>
  );
}
