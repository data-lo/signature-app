'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/form/form';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { SIGNATURE_DOCUMENT } from '../../_config/personal-documents.config';
import { signatureFileSchema } from '../../_schemas';
import PersonalDocumentCard from '../../_components/PersonalDocumentCard';
import DeleteConfirmDialog from '../../_components/DeleteConfirmDialog';
import { useUploadSignatureImage } from '../_hooks/useUploadSignatureImage';
import { useDeleteSignatureImage } from '../_hooks/useDeleteSignatureImage';

interface SignatureCardProps {
  status: SigningCredentialStatus;
}

const signatureFormSchema = z.object({ signatureFile: signatureFileSchema });
type SignatureFormValues = z.infer<typeof signatureFormSchema>;

const PENDING_SIGNATURE_CONFIG = {
  ...SIGNATURE_DOCUMENT,
  label: 'Agregar firma digital',
};

const REGISTERED_SIGNATURE_CONFIG = {
  ...SIGNATURE_DOCUMENT,
  label: 'Tu firma ha sido agregada',
};

/**
 * Paso 2: la firma PNG.
 *
 * La tarjeta se muestra SIEMPRE, incluso bloqueada. El diagrama de la pantalla lo pide así a
 * propósito: el usuario tiene que ver desde el principio que el flujo tiene dos pasos y por qué
 * el segundo todavía no está disponible.
 *
 * El bloqueo acá es de interfaz, no de seguridad: quien fuerce la petición se topa con el 403
 * del backend, que valida el mismo estado contra la base de datos.
 *
 * Los estados desbloqueados delegan en `PersonalDocumentCard`, la tarjeta de documento personal
 * de la sección: así la firma se ve y se maneja igual acá que en el resto de la aplicación, y
 * sus etiquetas, formatos y límites salen de `SIGNATURE_DOCUMENT` en vez de estar repetidos.
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
          Agregar firma digital · bloqueada
        </CardTitle>
        <CardDescription>
          {identityStarted
            ? 'Permanece visible; aún no se puede modificar.'
            : 'Se habilita cuando se apruebe tu identidad.'}
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
    <Form
      onSubmit={handleSubmit((values) =>
        uploadMutation.mutate(values.signatureFile),
      )}
    >
      <div className="flex flex-col gap-4">
        <PersonalDocumentCard
          config={PENDING_SIGNATURE_CONFIG}
          storedUrl={null}
          pendingFile={signatureFile}
          error={errors.signatureFile?.message}
          onFileChange={(file) =>
            setValue('signatureFile', (file ?? undefined) as File, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
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
      </div>
    </Form>
  );
}

function RegisteredSignature() {
  const { data: user } = useCurrentUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteSignatureImage();

  const signature = user?.signature ?? null;

  return (
    <>
      <PersonalDocumentCard
        config={REGISTERED_SIGNATURE_CONFIG}
        storedUrl={signature?.secureUrl ?? null}
        deleting={deleteMutation.isPending}
        onDelete={signature ? () => setConfirmingDelete(true) : undefined}
      />

      <DeleteConfirmDialog
        open={confirmingDelete}
        label={SIGNATURE_DOCUMENT.possessiveName}
        onOpenChange={(open) => !open && setConfirmingDelete(false)}
        onConfirm={() =>
          signature &&
          deleteMutation.mutate(signature.id, {
            onSuccess: () => setConfirmingDelete(false),
          })
        }
        confirming={deleteMutation.isPending}
      />
    </>
  );
}
