'use client';

import { useState } from 'react';
import { Check, Eye, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IdentityCheckOutcome } from '@/lib/enums/identity';
import type {
  CurrentIdentityVerification,
  IdentityVerificationChecks,
} from '../_requests';

interface IdentityDetailDialogProps {
  data: CurrentIdentityVerification;
}

/** Cómo se rotula cada comprobación del veredicto, en el orden en que ocurren en el flujo. */
const CHECK_LABELS: Array<{
  key: keyof IdentityVerificationChecks;
  label: string;
}> = [
  { key: 'documentReading', label: 'Lectura de tu identificación' },
  { key: 'faceMatch', label: 'Tu rostro coincide con la identificación' },
  { key: 'liveness', label: 'Prueba de vida' },
];

/**
 * "Ver detalle de la validación": qué se comprobó y cuándo.
 *
 * El desglose viene ya resumido del backend (`verification.checks`), que filtra el veredicto
 * crudo del proveedor: acá sólo llega cómo salió cada comprobación, nunca el nombre, el número de
 * documento, las imágenes de la INE ni las puntuaciones de los modelos.
 */
export default function IdentityDetailDialog({
  data,
}: IdentityDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const checks = data.verification?.checks ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Eye className="size-4" aria-hidden />
        Detalles
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de la validación</DialogTitle>
          <DialogDescription>
            Qué comprobamos para confirmar tu identidad.
          </DialogDescription>
        </DialogHeader>

        {checks ? (
          <ul className="flex flex-col gap-2 text-sm">
            {CHECK_LABELS.map(({ key, label }) => (
              <CheckRow key={key} label={label} outcome={checks[key]} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contamos con el detalle de las comprobaciones para esta
            verificación.
          </p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-4 text-sm">
          <DetailRow
            label="Validada el"
            value={formatDateTime(data.identityVerifiedAt)}
          />
          <DetailRow
            label="Verificación"
            value={data.verification?.id ?? 'No disponible'}
          />
          <DetailRow
            label="Firma registrada"
            value={data.signatureRegistered ? 'Sí' : 'Todavía no'}
          />
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Una comprobación no reportada (`null`) se dibuja en gris y con guion, distinta de una que
 * falló: decirle al usuario que algo "falló" cuando el proveedor sencillamente no lo evaluó
 * sería un error, y además el más alarmante de los dos.
 */
function CheckRow({
  label,
  outcome,
}: {
  label: string;
  outcome: IdentityCheckOutcome | null;
}) {
  const { icon, className, hint } = CHECK_PRESENTATION[outcome ?? 'missing'];

  return (
    <li className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span>{label}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">({hint})</span>
      ) : null}
    </li>
  );
}

const CHECK_PRESENTATION: Record<
  IdentityCheckOutcome | 'missing',
  { icon: React.ReactNode; className: string; hint?: string }
> = {
  [IdentityCheckOutcome.Passed]: {
    icon: <Check className="size-4 shrink-0" aria-hidden />,
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  [IdentityCheckOutcome.Failed]: {
    icon: <X className="size-4 shrink-0" aria-hidden />,
    className: 'text-destructive',
    hint: 'no superada',
  },
  [IdentityCheckOutcome.InReview]: {
    icon: <Minus className="size-4 shrink-0" aria-hidden />,
    className: 'text-amber-600',
    hint: 'en revisión',
  },
  missing: {
    icon: <Minus className="size-4 shrink-0" aria-hidden />,
    className: 'text-muted-foreground',
    hint: 'no reportada',
  },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return 'No disponible';

  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
