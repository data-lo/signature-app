'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const DocumentPreviewPane = dynamic(() => import('./DocumentPreviewPane'), { ssr: false });

interface DocumentPrepareModalProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { name: string; file: File; willSign: boolean }) => void;
}

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '');
}

export default function DocumentPrepareModal({ file, open, onOpenChange, onContinue }: DocumentPrepareModalProps) {
  const [documentName, setDocumentName] = useState('');
  const [willSign, setWillSign] = useState(false);

  useEffect(() => {
    if (file) {
      setDocumentName(stripPdfExtension(file.name));
      setWillSign(false);
    }
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex h-full">
          <div className="min-w-0 flex-1">
            <DocumentPreviewPane file={file} />
          </div>

          <div className="flex w-80 shrink-0 flex-col border-l border-gray-200 p-6">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">Configuración del documento</h2>

            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700">
                Nombre del documento
              </label>
              <div className="relative">
                <input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 pl-2.5 pr-12 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  .PDF
                </span>
              </div>
            </div>

            <div className="mb-8 flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">¿Vas a firmar este documento?</span>
              <Switch checked={willSign} onCheckedChange={setWillSign} />
            </div>

            <div className="mt-auto flex items-center gap-4">
              <Button
                variant="brand"
                onClick={() => {
                  onContinue({ name: documentName, file, willSign });
                  onOpenChange(false);
                }}
              >
                CONTINUAR
              </Button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
