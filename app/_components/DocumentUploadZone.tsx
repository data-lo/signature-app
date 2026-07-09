'use client';

import { useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface DocumentUploadZoneProps {
  onFileSelected: (file: File) => void;
}

export default function DocumentUploadZone({ onFileSelected }: DocumentUploadZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndEmit(file: File) {
    if (file.type !== 'application/pdf') {
      setError('El documento debe estar en formato PDF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('El documento debe pesar menos de 20 MB.');
      return;
    }
    setError(null);
    onFileSelected(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndEmit(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndEmit(file);
    e.target.value = '';
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Prepara un documento para solicitar que sea firmado
        </h1>
        <p className="text-xs text-muted-foreground">
          El documento debe estar en formato PDF y pesar menos de 20 MB
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground ${
          isDraggingOver
            ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/10'
            : 'border-gray-300 bg-background hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-gray-700 dark:hover:bg-emerald-500/10'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
        <CloudUpload className="size-5 text-muted-foreground" />
        <span>
          Arrastra tu documento en la página o{' '}
          <span className="text-emerald-600 hover:underline">da clic aquí para seleccionar uno</span>
        </span>
      </label>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
