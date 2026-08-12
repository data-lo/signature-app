'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/form/text-field';
import EfirmaFilePicker from './EfirmaFilePicker';
import {
  advancedSignatureSchema,
  type AdvancedSignatureFormValues,
} from '../_schemas';
import { Form } from '@/components/form/form';

export interface AdvancedSignatureSubmitValues {
  password: string;
  keyFile: File;
  cerFile: File;
}

interface AdvancedSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdvancedSignatureSubmitValues) => void;
  /** true mientras se valida la e.firma y se firma en el backend — deshabilita el formulario
   * completo para evitar envíos duplicados. */
  confirming: boolean;
}

export default function AdvancedSignatureDialog({
  open,
  onOpenChange,
  onSubmit,
  confirming,
}: AdvancedSignatureDialogProps) {
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [missingFilesError, setMissingFilesError] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdvancedSignatureFormValues>({
    resolver: zodResolver(advancedSignatureSchema),
  });

  // Al cerrar (cancelar o tras firmar con éxito) se limpia todo — reabrir el diálogo nunca debe
  // arrastrar archivos/contraseña de un intento anterior.
  useEffect(() => {
    if (!open) {
      reset();
      setKeyFile(null);
      setCerFile(null);
      setMissingFilesError(null);
    }
  }, [open, reset]);

  function handleFormSubmit(values: AdvancedSignatureFormValues) {
    if (!keyFile || !cerFile) {
      setMissingFilesError(
        'Sube tu llave privada (.key) y tu certificado (.cer) para continuar.',
      );
      return;
    }
    setMissingFilesError(null);
    onSubmit({ password: values.password, keyFile, cerFile });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Firma electrónica avanzada (e.firma)</DialogTitle>
          <DialogDescription>
            Sube tu llave privada (.key) y tu certificado (.cer), e ingresa la
            contraseña de tu e.firma para completar la firma.
          </DialogDescription>
        </DialogHeader>

        <Form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Llave privada (.key)
            </span>
            <EfirmaFilePicker
              extension="key"
              fileLabel="llave privada"
              onFileSelected={setKeyFile}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Certificado (.cer)
            </span>
            <EfirmaFilePicker
              extension="cer"
              fileLabel="certificado"
              onFileSelected={setCerFile}
            />
          </div>

          <TextField
            id="efirma-password"
            label="Contraseña de la llave privada"
            type="password"
            autoComplete="current-password"
            error={errors.password}
            {...register('password')}
          />

          {missingFilesError && (
            <p className="text-sm text-destructive">{missingFilesError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={confirming}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={confirming}>
              {confirming ? 'Validando y firmando...' : 'Firmar documento'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
