'use client';

import SignerChip from './SignerChip';

export interface SignerChipData {
  collaboratorIndex: number;
  label: string;
  colorClassName: string;
  placedCount: number;
}

interface SignerChipsBarProps {
  signers: SignerChipData[];
  rejectedId: string | null;
  rejectionNonce: number;
}

/** Fila de chips arrastrables, uno por firmante — panel lateral de la historia "Ubicación de firmas por usuario". */
export default function SignerChipsBar({
  signers,
  rejectedId,
  rejectionNonce,
}: SignerChipsBarProps) {
  if (signers.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Agrega firmantes para poder ubicar su firma en el documento.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      {signers.map((signer) => {
        const dndId = `chip-${signer.collaboratorIndex}`;
        const isRejected = rejectedId === dndId;
        return (
          <SignerChip
            // Cambiar el key remonta el nodo, lo que reinicia la animación CSS de rechazo aunque
            // dos rechazos ocurran seguidos en el mismo chip (ver rejectionNonce en el padre).
            key={isRejected ? `${dndId}-reject-${rejectionNonce}` : dndId}
            collaboratorIndex={signer.collaboratorIndex}
            label={signer.label}
            colorClassName={signer.colorClassName}
            placedCount={signer.placedCount}
            isRejected={isRejected}
          />
        );
      })}
    </div>
  );
}
