'use client';

import { useRef, useState } from 'react';
import { Eraser, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignaturePad, { type SignaturePadHandle } from './SignaturePad';

/**
 * El canvas con sus acciones: limpiar, guardar y —opcionalmente— cancelar.
 *
 * Envuelve a `SignaturePad` (que sólo sabe de trazos) con lo que las dos pantallas necesitan
 * igual, para que la web y el celular no acaben con dos versiones de las mismas reglas: no se
 * puede guardar un canvas vacío, y un trazo que al recortarse no deja píxeles se trata como vacío
 * en vez de subir un PNG en blanco.
 */
export default function SignatureDrawer({
  onSave,
  onCancel,
  saving = false,
  height,
  saveLabel = 'Guardar mi firma',
}: {
  onSave: (png: Blob) => void;
  onCancel?: () => void;
  saving?: boolean;
  height?: number;
  saveLabel?: string;
}) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    const png = await padRef.current?.toPngBlob();

    if (!png) {
      // Defensa real, no teórica: un trazo de un solo píxel transparente pasa `hasStroke` pero no
      // deja nada que recortar, y subirlo guardaría una firma en blanco.
      setError('Dibuja tu firma antes de guardarla.');
      return;
    }

    onSave(png);
  }

  function handleClear() {
    padRef.current?.clear();
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-dashed bg-white">
        <SignaturePad
          ref={padRef}
          height={height}
          disabled={saving}
          onStrokeChange={setHasStroke}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Dibuja tu firma con el mouse, el dedo o un lápiz óptico.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={!hasStroke || saving}
        >
          <Eraser className="size-4" aria-hidden />
          Limpiar
        </Button>

        <Button
          type="button"
          className="flex-1"
          onClick={handleSave}
          disabled={!hasStroke || saving}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Guardando...
            </>
          ) : (
            saveLabel
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
