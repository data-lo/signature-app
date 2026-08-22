'use client';

import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PersonalDocumentConfig } from '../_config/personal-documents.config';
import DocumentDropzone from './DocumentDropzone';
import DocumentFilePreview from './DocumentFilePreview';

interface PersonalDocumentCardProps {
  config: PersonalDocumentConfig;
  /** URL prefirmada del documento ya guardado; `null` si todavía no se ha subido. */
  storedUrl: string | null;
  /** Archivo elegido en el dropzone y aún sin guardar. */
  pendingFile?: File | null;
  error?: string;
  /** Sin handler no se ofrece cargar un archivo (el documento ya está guardado). */
  onFileChange?: (file: File | null) => void;
  /** Sin handler no se ofrece eliminar (el documento todavía no existe en el servidor). */
  onDelete?: () => void;
  deleting?: boolean;
  /** Marca el documento como no obligatorio en su título. */
  optional?: boolean;
}

/**
 * Tarjeta de un documento personal (INE o firma) con su previsualización siempre visible: antes
 * de guardar muestra el archivo elegido en el dropzone y después el ya almacenado. Concentrar
 * ambos estados en un mismo componente es lo que permite que las tres vistas de la sección
 * (sin documentos, incompleta y completa) se vean igual y solo cambien por lo que le falta a
 * cada documento.
 */
export default function PersonalDocumentCard({
  config,
  storedUrl,
  pendingFile = null,
  error,
  onFileChange,
  onDelete,
  deleting,
  optional,
}: PersonalDocumentCardProps) {
  const isStored = storedUrl !== null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isStored && <CheckCircle2 className="size-4 text-emerald-500" />}
          {config.label}
          {optional && !isStored && (
            <span className="text-sm font-normal text-muted-foreground">
              (opcional)
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {isStored ? 'Documento guardado' : config.hint}
        </CardDescription>

        {isStored && (
          <CardAction className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              render={
                <a href={storedUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink className="size-4" />
              Abrir
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={onDelete}
              >
                Eliminar
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <DocumentFilePreview
          source={storedUrl ?? pendingFile}
          label={config.label}
          emptyMessage={`Aquí verás ${config.possessiveName} en cuanto elijas el archivo, antes de guardarlo.`}
        />

        {!isStored && onFileChange && (
          // El nombre y las restricciones del documento ya están en la cabecera de la tarjeta:
          // el dropzone solo rotula la acción para no repetirlos.
          <DocumentDropzone
            id={config.inputId}
            label="Selecciona el archivo"
            accept={config.accept}
            file={pendingFile}
            error={error}
            onFileChange={onFileChange}
            maxFileSizeMB={config.maxFileSizeMB}
          />
        )}
      </CardContent>
    </Card>
  );
}
