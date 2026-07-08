'use client';

import { useCallback } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { ProcessServerConfigFunction, RevertServerConfigFunction } from 'filepond';
import { createDocumentRequest, deleteDocumentRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al subir el documento. Intenta de nuevo.'
  );
}

interface UseDocumentUploadProcessorParams {
  signerId: string | null;
  onUploadSuccess: (documentId: string) => void;
  onUploadReset: () => void;
}

export function useDocumentUploadProcessor({
  signerId,
  onUploadSuccess,
  onUploadReset,
}: UseDocumentUploadProcessorParams) {
  const process: ProcessServerConfigFunction = useCallback(
    (fieldName, file, metadata, load, error, progress, abort) => {
      if (!signerId) {
        error('Selecciona un firmante antes de subir el documento');
        return;
      }

      const controller = new AbortController();

      createDocumentRequest(
        file as File,
        signerId,
        (percent) => progress(true, percent, 1),
        controller.signal,
      )
        .then((data) => {
          toast.success('Documento subido correctamente');
          onUploadSuccess(data.id);
          load(data.id);
        })
        .catch((uploadError) => {
          const message = getErrorMessage(uploadError);
          toast.error(message);
          error(message);
        });

      return {
        abort: () => {
          controller.abort();
          abort();
        },
      };
    },
    [signerId, onUploadSuccess],
  );

  const revert: RevertServerConfigFunction = useCallback(
    (uniqueFileId, load) => {
      deleteDocumentRequest(uniqueFileId as string)
        .catch(() => {
          // Best-effort cleanup: si ya no se puede borrar (p. ej. cambió de estatus),
          // igual permitimos quitarlo de la vista.
        })
        .finally(() => {
          onUploadReset();
          load();
        });
    },
    [onUploadReset],
  );

  return { process, revert };
}
