'use client';

import { CloudUpload } from 'lucide-react';

export default function DocumentUploadZone() {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Prepara un documento para solicitar que sea firmado
        </h1>
        <p className="text-xs text-gray-500">
          El documento debe estar en formato PDF y pesar menos de 20 MB
        </p>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-white py-8 text-sm text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/30">
        <input type="file" accept="application/pdf" className="hidden" />
        <CloudUpload className="size-5 text-gray-400" />
        <span>
          Arrastra tu documento en la página o{' '}
          <span className="text-emerald-600 hover:underline">da clic aquí para seleccionar uno</span>
        </span>
      </label>
    </section>
  );
}
