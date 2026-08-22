'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Form } from '@/components/form/form';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { signatureFileSchema } from '../../_schemas';
import DocumentDropzone from '../../_components/DocumentDropzone';
import DocumentPreviewItem from '../../_components/DocumentPreviewItem';
import DeleteConfirmDialog from '../../_components/DeleteConfirmDialog';
import { useUploadSignatureImage } from '../_hooks/useUploadSignatureImage';
import { useDeleteSignatureImage } from '../_hooks/useDeleteSignatureImage';

interface SignatureCardProps {
  status: SigningCredentialStatus;
}

const signatureFormSchema = z.object({ signatureFile: signatureFileSchema });
type SignatureFormValues = z.infer<typeof signatureFormSchema>;

/**
 * Paso 2: la firma PNG.
 *
 * La tarjeta se muestra SIEMPRE, incluso bloqueada. El diagrama de la pantalla lo pide así a
 * propósito: el usuario tiene que ver desde el principio que el flujo tiene dos pasos y por qué
 * el segundo todavía no está disponible.
 *
 * El bloqueo acá es de interfaz, no de seguridad: quien fuerce la petición se topa con el 403
 * del backend, que valida el mismo estado contra la base de datos.
 */
export default function SignatureCard({ status }: SignatureCardProps) {
  if (status === SigningCredentialStatus.Configured) {
    return <RegisteredSignature />;
  }

  if (status === SigningCredentialStatus.SignaturePending) {
    return <SignatureUploadForm />;
  }

  return <LockedSignature status={status} />;
}

function LockedSignature({ status }: { status: SigningCredentialStatus }) {
  const identityStarted =
    status !== SigningCredentialStatus.IdentityVerificationRequired;

  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <LockKeyhole className="size-5" />
          Firma PNG · bloqueada
        </CardTitle>
        <CardDescription>
          {identityStarted
            ? 'Permanece visible; aún no se puede modificar.'
            : 'Se habilita cuando Didit apruebe tu identidad.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function SignatureUploadForm() {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureFormSchema),
    mode: 'onChange',
  });

  const uploadMutation = useUploadSignatureImage();
  const signatureFile = watch('signatureFile') ?? null;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle>Firma PNG · paso 2 de 2</CardTitle>
        <CardDescription>
          Sube la imagen de tu firma para dejar tu credencial lista. Se usará en
          cada documento que firmes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={handleSubmit((values) =>
            uploadMutation.mutate(values.signatureFile),
          )}
        >
          <FieldGroup>
            <DocumentDropzone
              id="signatureFile"
              label="Firma digital"
              hint="Formato PNG. Máximo 10MB."
              accept="image/png"
              file={signatureFile}
              error={errors.signatureFile?.message}
              onFileChange={(file) =>
                setValue('signatureFile', (file ?? undefined) as File, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              maxFileSizeMB={10}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando tu firma...
                </>
              ) : (
                'Guardar mi firma'
              )}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisteredSignature() {
  const { data: user } = useCurrentUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteSignatureImage();

  const signature = user?.signature ?? null;

  return (
    <Card className="border-emerald-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          Firma registrada
        </CardTitle>
        <CardDescription>
          Tu credencial está lista: ya puedes firmar documentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {signature ? (
          <DocumentPreviewItem
            label="Firma digital"
            secureUrl={signature.secureUrl}
            deleting={deleteMutation.isPending}
            onDelete={() => setConfirmingDelete(true)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Cargando la vista previa de tu firma...
          </p>
        )}
      </CardContent>

      <DeleteConfirmDialog
        open={confirmingDelete}
        label="tu firma digital"
        onOpenChange={(open) => !open && setConfirmingDelete(false)}
        onConfirm={() =>
          signature &&
          deleteMutation.mutate(signature.id, {
            onSuccess: () => setConfirmingDelete(false),
          })
        }
        confirming={deleteMutation.isPending}
      />
    </Card>
  );
}
