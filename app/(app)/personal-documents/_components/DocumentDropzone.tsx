'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentDropzoneProps {
  id: string;
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  error?: string;
  onFileChange: (file: File | null) => void;
}

export default function DocumentDropzone({
  id,
  label,
  hint,
  accept,
  file,
  error,
  onFileChange,
}: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  function handleRemove() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div
        className={cn(
          'flex items-center gap-4 rounded-md border border-dashed p-4',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Vista previa de ${label}`}
            className="h-16 w-16 rounded object-contain bg-muted"
          />
        ) : file ? (
          <FileText
            className="h-10 w-10 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <Upload
            className="h-10 w-10 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          {file ? (
            <p className="text-sm font-medium truncate">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{hint}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {file ? 'Cambiar archivo' : 'Seleccionar archivo'}
            </Button>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
                Quitar
              </Button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
